const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const CSV_FILE = 'spotify_dataset.csv';
const LOCAL_LOGS_FILE = 'mood_logs_local.json';

const MOODS = ['happy', 'sad', 'energetic', 'calm', 'stressed'];
const AGE_GROUPS = ["13-17", "18-25", "26-35", "36-50", "50+"];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Simple heuristic to guess mood from title, otherwise random
function guessMood(title) {
    const t = title.toLowerCase();
    if (t.includes('remix') || t.includes('party') || t.includes('dance') || t.includes('club')) return 'energetic';
    if (t.includes('sad') || t.includes('broken') || t.includes('tears') || t.includes('pain') || t.includes('lonely')) return 'sad';
    if (t.includes('sleep') || t.includes('night') || t.includes('chill') || t.includes('relax')) return 'calm';
    if (t.includes('love') || t.includes('heart')) return 'happy'; // or sad? ambiguous.
    
    // Default: Random distribution
    return getRandom(MOODS);
}

// Robust CSV Line Splitter
function splitCsv(str) {
    const result = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function cleanStr(s) {
    if (!s) return '';
    return s.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
}

async function importDataset() {
  console.log('--- STARTING DATASET UPGRADE (RANDOMIZED MOODS) ---');
  
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`File ${CSV_FILE} not found!`);
    return;
  }

  // 1. Load existing logs and purge old dataset entries
  let existingLogs = [];
  try {
    if (fs.existsSync(LOCAL_LOGS_FILE)) {
      const raw = fs.readFileSync(LOCAL_LOGS_FILE, 'utf8');
      const allLogs = JSON.parse(raw || '[]');
      // Keep only REAL user logs (filter out ANY previous 'dataset_import')
      existingLogs = allLogs.filter(l => l.user_id !== 'dataset_import');
      console.log(`Preserving ${existingLogs.length} user-generated logs.`);
    }
  } catch(e) { console.warn("Error reading local logs:", e.message); }

  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let newLogs = [];
  let headerSkipped = false;
  let count = 0;

  for await (const line of rl) {
    if (!headerSkipped) { headerSkipped = true; continue; }

    const cols = splitCsv(line);
    if (cols.length < 8) continue;

    // Mapping based on inspected CSV structure
    // 0: ID, 1: Name, 2: Artist, 3: Album, 4: Date, 5: Image, 6: Pop, 7: Genre
    const trackId = cleanStr(cols[0]);
    const trackName = cleanStr(cols[1]);
    const artistRaw = cleanStr(cols[2]); 
    const coverImage = cleanStr(cols[5]);
    
    // Genre column is regional (Bollywood/English), ignoring it for mood mapping.
    // Using title heuristics + Randomness
    const mood = guessMood(trackName);

    // Clean up Artist: "['Artist 1', 'Artist 2']" -> "Artist 1"
    let artistName = artistRaw;
    if (artistName.startsWith("['")) {
        artistName = artistName.replace(/\['|'\]/g, '').split("', '")[0];
    }

    newLogs.push({
      _id: new Date().getTime().toString() + Math.random().toString().slice(2,5),
      user_id: 'dataset_import',
      mood: mood,
      age_group: getRandom(AGE_GROUPS),
      spotify_id: trackId,
      // METADATA FOR OFFLINE RECS
      track_name: trackName,
      artist_name: artistName,
      image_url: coverImage,
      listened: true,
      play_seconds: 120,
      created_at: new Date().toISOString(),
      source: 'dataset'
    });

    count++;
  }

  console.log(`Parsed ${count} new entries with distributed moods.`);

  // 2. Save Combined Logs
  const finalLogs = existingLogs.concat(newLogs);
  fs.writeFileSync(LOCAL_LOGS_FILE, JSON.stringify(finalLogs, null, 2), 'utf8');
  console.log(`Saved ${finalLogs.length} total entries to ${LOCAL_LOGS_FILE}`);

  // 3. Update MongoDB (Optional)
  if (process.env.MONGODB_URI) {
     console.log('Note: MongoDB sync skipped. Use local mode.');
  }

  console.log('--- IMPORT COMPLETE ---');
}

importDataset();
