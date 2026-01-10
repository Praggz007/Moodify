const fs = require('fs');
const path = require('path');
const { getCollection } = require('./db');

const MODEL_FILE = path.join(__dirname, 'model_centroids.json');
const LOGS_FILE = path.join(__dirname, 'mood_logs_local.json');

// Helper to load local logs
function loadLocalLogs() {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (e) {
    console.warn('Error reading local logs:', e.message);
  }
  return [];
}

// Helper to load model
function loadModel() {
  try {
    if (fs.existsSync(MODEL_FILE)) {
      return JSON.parse(fs.readFileSync(MODEL_FILE, 'utf8'));
    }
  } catch (e) {
    // console.error('Error loading model:', e.message);
  }
  return {};
}

// Save model
function saveModel(model) {
  fs.writeFileSync(MODEL_FILE, JSON.stringify(model, null, 2), 'utf8');
}

/**
 * Trains the "model" by calculating the centroid (average audio features)
 * for each mood+age_group combination based on listened songs.
 */
async function trainModel() {
  // Lazy load to avoid circular dependency
  const { getAudioFeatures } = require('./spotify');
  
  console.log('Starting model training...');
  
  // 1. Fetch Logs
  let logs = [];
  try {
    const collection = await getCollection();
    // Filter for logs that have a valid spotify_id and where listened is true (if tracked)
    // Note: If 'listened' isn't reliably tracked yet, we might relax this or assume all logs are "likes"
    logs = await collection.find({ spotify_id: { $exists: true, $ne: null } }).toArray();
    console.log(`Fetched ${logs.length} logs from MongoDB.`);
  } catch (e) {
    console.warn('MongoDB fetch failed/skipped, trying local logs:', e.message);
    logs = loadLocalLogs().filter(l => l.spotify_id);
  }

  if (logs.length === 0) {
    console.log('No sufficient data to train model.');
    return;
  }

  // 2. Group by mood + age
  // Key: "mood|age_group" -> List of spotify_ids
  const groups = {};
  logs.forEach(log => {
    // Basic normalization
    const mood = (log.mood || 'unknown').toLowerCase();
    const age = log.age_group || 'unknown';
    const key = `${mood}|${age}`;
    
    if (!groups[key]) groups[key] = new Set(); // use Set to avoid duplicates
    groups[key].add(log.spotify_id);
  });

  // 3. Calculate Centroids
  const model = loadModel(); // Start with existing or empty

  for (const key of Object.keys(groups)) {
    const trackIds = Array.from(groups[key]);
    // Filter out mock IDs if any
    const validIds = trackIds.filter(id => !id.startsWith('mock-'));
    
    if (validIds.length === 0) continue;

    // Process in chunks of 50 to respect Spotify limits
    const chunks = [];
    for (let i = 0; i < validIds.length; i += 50) {
      chunks.push(validIds.slice(i, i + 50));
    }

    let totalFeatures = { valence: 0, energy: 0, danceability: 0, acousticness: 0, tempo: 0, count: 0 };
    let featuresList = [];

    // Try to fetch real features first
    let fetchFailed = false;
    for (const chunk of chunks) {
      try {
        const realFeatures = await getAudioFeatures(chunk);
        if (!realFeatures || realFeatures.length === 0) {
            fetchFailed = true;
            break; 
        }
        featuresList.push(...realFeatures);
      } catch (err) {
        fetchFailed = true; 
        console.warn(`Real feature fetch failed for ${key}, switching to mock data.`);
      }
    }

    // If real data failed, generate mock data based on the Mood
    if (fetchFailed || featuresList.length === 0) {
        console.log(`Using MOCK training data for group: ${key}`);
        const mood = key.split('|')[0];
        featuresList = generateMockFeatures(mood, validIds.length);
    }

    for (const f of featuresList) {
        if (!f) continue;
        totalFeatures.valence += f.valence;
        totalFeatures.energy += f.energy;
        totalFeatures.danceability += f.danceability;
        totalFeatures.acousticness += f.acousticness;
        totalFeatures.tempo += f.tempo;
        totalFeatures.count++;
    }

    if (totalFeatures.count > 0) {
      model[key] = {
        valence: totalFeatures.valence / totalFeatures.count,
        energy: totalFeatures.energy / totalFeatures.count,
        danceability: totalFeatures.danceability / totalFeatures.count,
        acousticness: totalFeatures.acousticness / totalFeatures.count,
        tempo: totalFeatures.tempo / totalFeatures.count,
        sampleSize: totalFeatures.count,
        lastUpdated: new Date().toISOString()
      };
      console.log(`Updated model for ${key} (n=${totalFeatures.count})`);
    }
  }

  saveModel(model);
  console.log('Model training complete.');
  return model;
}

// Baselines for mock generation (simulates what we expect songs of this mood to look like)
const MOCK_BASELINES = {
  happy: { valence: 0.8, energy: 0.75, danceability: 0.85, acousticness: 0.15, tempo: 120 },
  energetic: { valence: 0.85, energy: 0.85, danceability: 0.8, acousticness: 0.1, tempo: 130 },
  calm: { valence: 0.3, energy: 0.2, danceability: 0.3, acousticness: 0.7, tempo: 70 },
  sad: { valence: 0.2, energy: 0.25, danceability: 0.25, acousticness: 0.8, tempo: 60 },
  stressed: { valence: 0.35, energy: 0.3, danceability: 0.4, acousticness: 0.6, tempo: 75 },
};

function generateMockFeatures(mood, count) {
    const base = MOCK_BASELINES[mood] || MOCK_BASELINES.happy;
    const results = [];
    
    for(let i=0; i<count; i++) {
        // Add random variation (+/- 0.1) to simulate different songs
        results.push({
            valence: Math.max(0, Math.min(1, base.valence + (Math.random() * 0.2 - 0.1))),
            energy: Math.max(0, Math.min(1, base.energy + (Math.random() * 0.2 - 0.1))),
            danceability: Math.max(0, Math.min(1, base.danceability + (Math.random() * 0.2 - 0.1))),
            acousticness: Math.max(0, Math.min(1, base.acousticness + (Math.random() * 0.2 - 0.1))),
            tempo: Math.max(50, base.tempo + (Math.random() * 20 - 10))
        });
    }
    return results;
}

/**
 * Predicts target audio features for a given mood and age.
 * Returns null if no model exists for this combo.
 */
function predict(mood, ageGroup) {
  const model = loadModel();
  const key = `${mood.toLowerCase()}|${ageGroup}`;
  return model[key] || null;
}

/**
 * Returns random recommendations from the LOCAL dataset (logs)
 * This is useful when the Spotify API is restricted or down.
 */
function getLocalRecommendations(mood, count = 8) {
  const logs = loadLocalLogs();
  
  // Filter by mood and ensure it has metadata (track_name)
  const candidates = logs.filter(l => 
    l.mood === mood.toLowerCase() && 
    l.track_name && 
    l.source === 'dataset' // Prefer high-quality dataset entries
  );

  if (candidates.length === 0) return [];

  // Shuffle and pick
  const shuffled = candidates.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  // Format like Spotify Track Object
  return selected.map(item => ({
    id: item.spotify_id,
    name: item.track_name,
    artists: [{ name: item.artist_name }],
    album: { images: [{ url: item.image_url }] },
    preview_url: null, // Dataset doesn't have preview URLs usually
    external_urls: { spotify: `https://open.spotify.com/track/${item.spotify_id}` }
  }));
}

module.exports = { trainModel, predict, getLocalRecommendations };
