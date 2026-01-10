const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const OUTPUT_FILE = 'mood_logs_local.json';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Mappings
const MOODS = ['happy', 'sad', 'energetic', 'calm', 'stressed'];
const AGE_GROUPS = ["13-17", "18-25", "26-35", "36-50", "50+"];

// Specific Search Queries to get high quality data
const QUERIES = {
    happy: [
        "Hindi Happy Hits", "Bollywood Dance", "Feel Good Hindi",
        "Happy Bollywood", "Punjabi Bhangra", "Latest Hindi Hits",
        "Bollywood Wedding", "Hindi Party"
    ],
    sad: [
        "Hindi Sad Songs", "Arijit Singh Sad", "Bollywood Heartbreak",
        "Atif Aslam Sad", "Old Hindi Sad Songs", "Sentimental Hindi",
        "Mohit Chauhan Sad", "Broken Heart Hindi"
    ],
    energetic: [
        "Bollywood Party", "Punjabi Hits", "Hindi Gym Songs",
        "Honey Singh Hits", "Badshah Hits", "High Rated Gabru",
        "Bollywood Club", "Desi Hip Hop"
    ],
    calm: [
        "Hindi Acoustic", "Bollywood Lo-Fi", "Old Hindi Classics",
        " Kishore Kumar Classics", "Mohammad Rafi Hits", "Lata Mangeshkar",
        "Hindi Unplugged", "Soulful Bollywood"
    ],
    stressed: [
        "Hindi Instrumental", "Sufi Songs", "Relaxing Bollywood",
        "Rahat Fateh Ali Khan Sufi", "Indian Flute", "Bollywood Piano",
        "Peaceful Hindi", "Meditation Indian"
    ]
};

async function getSpotifyToken() {
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        },
        body: "grant_type=client_credentials",
    });
    const data = await res.json();
    return data.access_token;
}

async function searchSpotify(token, query, totalNeeded = 100) {
    let allTracks = [];
    const limit = 50; // Spotify max
    
    // Fetch in batches (0-50, 50-100)
    for (let offset = 0; offset < totalNeeded; offset += limit) {
        try {
            console.log(`    Fetching offset ${offset}...`);
            const res = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&offset=${offset}&market=IN`, // Market: IN for better Bollywood results
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (!res.ok) {
                if (res.status === 429) {
                    console.warn("    Rate limited. Waiting...");
                    await new Promise(r => setTimeout(r, 2000));
                    continue; 
                }
                break;
            }

            const data = await res.json();
            if (data.tracks && data.tracks.items) {
                allTracks = allTracks.concat(data.tracks.items);
            }
            
            // Respect API
            await new Promise(r => setTimeout(r, 500)); 

        } catch (e) {
            console.error(`    Failed to fetch query "${query}":`, e.message);
        }
    }
    return allTracks;
}

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
    console.log("--- FETCHING MASSIVE BOLLYWOOD DATASET (100 songs/term) ---");
    
    // 1. Preserve User Logs
    let existingLogs = [];
    try {
        if (fs.existsSync(OUTPUT_FILE)) {
            const raw = fs.readFileSync(OUTPUT_FILE, 'utf8');
            const all = JSON.parse(raw || '[]');
            existingLogs = all.filter(l => l.user_id !== 'dataset_import');
            console.log(`Preserving ${existingLogs.length} user-generated logs.`);
        }
    } catch (e) {}

    const token = await getSpotifyToken();
    let newLogs = [];

    // 2. Fetch Songs
    for (const mood of MOODS) {
        console.log(`Fetching songs for mood: ${mood.toUpperCase()}...`);
        const searchTerms = QUERIES[mood];
        
        for (const term of searchTerms) {
            console.log(`  - Searching: "${term}"`);
            const tracks = await searchSpotify(token, term, 100);
            
            // Convert to Log Format
            tracks.forEach(t => {
                if (!t) return;
                
                // Assign a random age group
                const age = getRandom(AGE_GROUPS);

                newLogs.push({
                    _id: new Date().getTime().toString() + Math.random().toString().slice(2,5),
                    user_id: 'dataset_import',
                    mood: mood,
                    age_group: age,
                    spotify_id: t.id,
                    track_name: t.name,
                    artist_name: t.artists.map(a => a.name).join(', '),
                    image_url: t.album.images[0] ? t.album.images[0].url : '',
                    listened: true,
                    play_seconds: 180,
                    created_at: new Date().toISOString(),
                    source: 'dataset'
                });
            });
            console.log(`    -> Added ${tracks.length} tracks.`);
        }
    }

    // 3. Save
    const finalLogs = existingLogs.concat(newLogs);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalLogs, null, 2), 'utf8');
    
    console.log(`\nSUCCESS! Saved ${finalLogs.length} total entries.`);
    console.log(`(New Dataset: ${newLogs.length} songs, User Logs: ${existingLogs.length})`);
    console.log("Please restart your server (node server.js) to use the new data.");
}

run();
