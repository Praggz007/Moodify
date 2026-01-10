// server.js
// MongoDB + Spotify backend (NO Supabase, NO Firebase)

require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const spotify = require("./spotify");
const mlService = require("./ml-service");

// prevent process from exiting on unexpected rejections during DB connect
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});

const app = express();
const PORT = process.env.PORT || 3002;

// ---------- MIDDLEWARE ----------
app.use(cors());
app.use(express.json());

// Serve static files from project root (index.html, css, js, sw.js, etc.)
const publicPath = path.join(__dirname);
app.use(express.static(publicPath));

// Root route fallback: send index.html for GET /
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ---------- MONGODB CONFIG ----------
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "moodify";
const COLLECTION_NAME = "mood_logs";

let moodLogsCollection;

// ---------- CONNECT TO MONGODB ----------
async function connectMongo() {
  try {
    const client = new MongoClient(MONGODB_URI);
    client.on('error', (e) => {
      console.warn('Mongo client emitted error event:', e && e.message ? e.message : e);
    });
    await client.connect();
    const db = client.db(DB_NAME);
    moodLogsCollection = db.collection(COLLECTION_NAME);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}
connectMongo();

// ---------- SPOTIFY RECOMMENDATIONS (ML ENHANCED) ----------
app.post("/api/recommendations", async (req, res) => {
  try {
    const { mood, age_group } = req.body;
    if (!mood) return res.status(400).json({ error: "Missing mood" });

    console.log(`Getting recommendations for Mood: ${mood}, Age: ${age_group}`);

    // 1. Try Local Dataset First (Fast, Varied, No API Limits)
    const localTracks = mlService.getLocalRecommendations(mood, 8);
    if (localTracks && localTracks.length > 0) {
        console.log(`Returning ${localTracks.length} tracks from Local Dataset.`);
        return res.json({ tracks: localTracks });
    }

    // 2. Fallback to Spotify Search (Restricted/Repetitive)
    console.log("Local dataset empty for this mood, falling back to Spotify API...");
    const tracks = await spotify.getRecommendationsByMoodAndAge(mood, age_group);
    
    res.json({ tracks });
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

// ---------- ML TRAINING ENDPOINT ----------
app.post("/api/train", async (req, res) => {
  try {
    console.log("Triggering ML model training...");
    const model = await mlService.trainModel();
    res.json({ success: true, message: "Model trained successfully", modelSummary: Object.keys(model).length + " groups trained" });
  } catch (err) {
    console.error("Training error:", err);
    res.status(500).json({ error: "Failed to train model" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Missing query" });

    const tracks = await spotify.searchSongsByMood(q);
    res.json({ tracks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Spotify search failed" });
  }
});

// ---------- SAVE MOOD LOG ----------

app.post("/api/log", async (req, res) => {

  try {

    const {

      user_id = "guest",

      mood,

      age_group,

      spotify_id,

      listened,

      play_seconds,

    } = req.body;



    if (!mood) {

      return res.status(400).json({ error: "Mood is required" });

    }



    const doc = {

      user_id,

      mood,

      age_group,

      spotify_id,

      listened,

      play_seconds,

      created_at: new Date(),

    };



    let source = "local";

    let insertedId = null;



    if (moodLogsCollection) {

      try {

        const result = await moodLogsCollection.insertOne(doc);

        insertedId = result.insertedId;

        source = "mongo";

      } catch (e) {

        console.warn("MongoDB insert failed, using fallback:", e.message);

      }

    }



    // Fallback to local file if MongoDB unavailable

    if (source === "local") {

      const logs = loadLocalLogs();

      doc._id = insertedId || new Date().getTime().toString();

      logs.push(doc);

      saveLocalLogs(logs);

      insertedId = doc._id;

    }



    res.json({

      success: true,

      id: insertedId,

      source: source,

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Failed to save mood log" });

  }

});



// ---------- UPDATE MOOD LOG (PATCH) ----------

app.patch("/api/log/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const { play_seconds, listened } = req.body;

    

    // Convert to ObjectId if possible (for Mongo)

    let mongoId = id;

    try {

      if(id.length === 24) { // Basic ObjectId check

         const { ObjectId } = require('mongodb');

         mongoId = new ObjectId(id);

      }

    } catch(e) {}



    if (moodLogsCollection) {

      try {

        await moodLogsCollection.updateOne(

          { _id: mongoId },

          { $set: { play_seconds, listened } }

        );

      } catch (e) {

        console.warn("MongoDB update failed:", e.message);

      }

    }



    // Always try to update local file too if it exists (simple sync)

    const logs = loadLocalLogs();

    const logIndex = logs.findIndex(l => l._id.toString() === id.toString());

    if (logIndex >= 0) {

      if (play_seconds !== undefined) logs[logIndex].play_seconds = play_seconds;

      if (listened !== undefined) logs[logIndex].listened = listened;

      saveLocalLogs(logs);

    }



    res.json({ success: true });

  } catch (err) {

    console.error("Update error:", err);

    res.status(500).json({ error: "Failed to update mood log" });

  }

});



// ---------- GET RECENT LOGS (DEBUG) ----------

app.get("/api/log", async (req, res) => {
  try {
    let rows = [];
    let source = "local";

    if (moodLogsCollection) {
      try {
        rows = await moodLogsCollection
          .find()
          .sort({ created_at: -1 })
          .limit(20)
          .toArray();
        source = "mongo";
      } catch (e) {
        console.warn("MongoDB query failed, using local fallback:", e.message);
      }
    }

    // Fallback to local file if MongoDB unavailable or query failed
    if (source === "local") {
      rows = loadLocalLogs().slice(0, 20);
    }

    res.json({ logs: rows, source: source });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ---------- START SERVER ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Fallback file path for local storage
const LOGS_FILE = path.join(__dirname, 'mood_logs_local.json');

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

function saveLocalLogs(logs) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving local logs:', e.message);
  }
}
