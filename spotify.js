// 🔒 Require valid Spotify credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const mlService = require('./ml-service');

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('ERROR: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required.');
  console.error('Please set them before starting the server:');
  console.error('  $env:SPOTIFY_CLIENT_ID="your_client_id"');
  console.error('  $env:SPOTIFY_CLIENT_SECRET="your_client_secret"');
}

// Ensure fetch is available (Node 18+ has it built-in; older versions need node-fetch)
if (typeof fetch === 'undefined' && typeof require !== 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.warn('Warning: node-fetch not available; fetch will fail in Node < 18');
  }
}

// ===== MOOD TO AUDIO-FEATURES MAPPING =====
const MOOD_FEATURES = {
  happy: { valence: 0.8, energy: 0.75, danceability: 0.85, acousticness: 0.15, tempo: 120 },
  energetic: { valence: 0.85, energy: 0.85, danceability: 0.8, acousticness: 0.1, tempo: 130 },
  calm: { valence: 0.3, energy: 0.2, danceability: 0.3, acousticness: 0.7, tempo: 70 },
  sad: { valence: 0.2, energy: 0.25, danceability: 0.25, acousticness: 0.8, tempo: 60 },
  stressed: { valence: 0.35, energy: 0.3, danceability: 0.4, acousticness: 0.6, tempo: 75 },
};

// ===== AGE GROUP AUDIO-FEATURE ADJUSTMENTS =====
const AGE_ADJUSTMENTS = {
  "13-17": { danceability: 0.05, tempo: 10, energy: 0.03 },
  "18-25": { danceability: 0.02, tempo: 0, energy: 0 },
  "26-35": { acousticness: 0.03, tempo: -5 },
  "36-50": { acousticness: 0.05, tempo: -10, energy: -0.05 },
  "50+": { acousticness: 0.08, tempo: -15, energy: -0.1 },
};

// ===== MOOD-TO-GENRE SEED MAPPING =====
// Used for constructing search queries since Recommendations API is restricted
const MOOD_GENRES = {
  happy: "pop",
  energetic: "dance",
  calm: "acoustic",
  sad: "indie",
  stressed: "classical",
};

async function getSpotifyToken() {
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const rawCreds = `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`;
  const credentials = typeof Buffer !== "undefined"
    ? Buffer.from(rawCreds).toString("base64")
    : (typeof btoa === "function" ? btoa(rawCreds) : null);

  if (!credentials) throw new Error("Unable to encode Spotify credentials.");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Spotify token: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data && data.access_token ? data.access_token : null;
}

async function searchSongsByMood(mood) {
  const token = await getSpotifyToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(mood)}&type=track&limit=8&market=US`,
    { headers: { "Authorization": `Bearer ${token}` } }
  );

  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const data = await res.json();
  return (data.tracks && data.tracks.items) ? data.tracks.items : [];
}

// ===== FALLBACK: USE SEARCH INSTEAD OF RECOMMENDATIONS =====
async function getRecommendationsByMoodAndAge(moodKey, ageGroup = "18-25", skippedTracks = [], user_id = 'guest') {
  const token = await getSpotifyToken();

  // Try to get personalized targets from the ML model
  const targets = mlService.predict(user_id, moodKey, ageGroup);

  let tracks = [];

  if (targets) {
    console.log(`Using ML-based recommendations for ${user_id}|${moodKey}|${ageGroup}`);
    const url = new URL("https://api.spotify.com/v1/recommendations");
    url.searchParams.append('limit', 20);
    url.searchParams.append('market', 'US');
    url.searchParams.append('seed_genres', MOOD_GENRES[moodKey.toLowerCase()] || "pop");
    
    // Add target audio features from our model
    Object.keys(targets).forEach(key => {
        if (['valence', 'energy', 'danceability', 'acousticness', 'tempo'].includes(key)) {
            url.searchParams.append(`target_${key}`, targets[key].toFixed(3));
        }
    });

    const res = await fetch(url.toString(), {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      tracks = data.tracks || [];
    } else {
      console.warn(`ML recommendations failed (${res.status}), falling back to search.`);
      // Fallback is handled below
    }
  } 
  
  // Fallback to search if ML recommendations fail or don't exist
  if (tracks.length === 0) {
    const genre = MOOD_GENRES[moodKey.toLowerCase()] || "pop";
    const query = `genre:${genre} ${moodKey}`;
    console.log(`Using Search-based recommendations for ${moodKey}/${ageGroup}: "${query}"`);
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20&market=US`;
    const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Spotify search (fallback) failed: ${res.status} ${res.statusText} - ${text}`);
    }
    const data = await res.json();
    tracks = (data.tracks && data.tracks.items) ? data.tracks.items : [];
  }

  // Filter out skipped tracks from the results
  if (skippedTracks.length > 0) {
    const skippedSet = new Set(skippedTracks);
    tracks = tracks.filter(t => !skippedSet.has(t.id));
  }

  return tracks.slice(0, 8);
}

async function getAudioFeatures(trackIds) {
  const token = await getSpotifyToken();
  const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;

  const res = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
     // If 403/404, we return empty to avoid crashing training
     if (res.status === 403 || res.status === 404) {
         console.warn(`Audio features not available (Status ${res.status}). Training will be skipped.`);
         return [];
     }
     const text = await res.text();
     throw new Error(`Spotify audio-features failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data.audio_features || [];
}

// Export helpers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getRecommendationsByMoodAndAge,
    searchSongsByMood,
    getAudioFeatures,
    getSpotifyToken
  };
}

async function getAudioFeatures(trackIds) {
  const token = await getSpotifyToken();
  if (!token) throw new Error("No Spotify access token available.");

  // trackIds can be a single string or array
  const ids = Array.isArray(trackIds) ? trackIds.join(',') : trackIds;

  const res = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
     const text = await res.text();
     throw new Error(`Spotify audio-features failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data.audio_features || [];
}

// If this file is run directly (node spotify.js), run a quick example.
if (typeof require !== "undefined" && require.main === module) {
  (async () => {
    try {
      const songs = await searchSongsByMood("happy");
      console.log(songs);
    } catch (err) {
      console.error(err);
    }
  })();
}

// Export helpers for server use when required in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getRecommendationsByMoodAndAge,
    searchSongsByMood,
    getAudioFeatures,
    getSpotifyToken
  };
}
