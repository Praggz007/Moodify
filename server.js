// server.js
// MongoDB + Spotify backend (NO Supabase, NO Firebase)

require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb"); // Import ObjectId
const fs = require("fs");
const path = require("path");
const spotify = require("./spotify");
const mlService = require("./ml-service");
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing
const session = require('express-session'); // Import express-session

// prevent process from exiting on unexpected rejections during DB connect
process.on('unhandledRejection', (reason) => {
  console.warn('Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.stack ? err.stack : err);
});

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for secure cookies behind load balancers (like Render, Heroku)
app.set('trust proxy', 1);

// ---------- MIDDLEWARE ----------
app.use(cors({
  origin: true, // Allow any origin (reflects the request origin)
  credentials: true // Allow cookies to be sent
}));
app.use(express.json());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key_here_please_change_me', // VERY important to use a strong secret
    resave: false,
    saveUninitialized: false,
    store: new (require('connect-mongo').default)({
        mongoUrl: process.env.MONGODB_URI, // Use MONGODB_URI from .env
        dbName: "moodify", // Use the DB_NAME
        collectionName: 'sessions', // Collection to store session data
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'interval',
        autoRemoveInterval: 10 // minutes
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        httpOnly: true, // Prevent client-side JS from reading the cookie
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'lax' // CSRF protection
    }
}));


// Serve static files from the 'public' directory
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// Root route fallback: send index.html for GET /
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ---------- MONGODB CONFIG ----------
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = "moodify";
const COLLECTION_MOOD_LOGS = "mood_logs";
const COLLECTION_USER_SETTINGS = "user_settings";
const COLLECTION_USERS = "users"; // New collection for users

let moodLogsCollection;
let userSettingsCollection;
let usersCollection; // Declare users collection

// ---------- CONNECT TO MONGODB ----------
async function connectMongo() {
  if (!MONGODB_URI) {
    console.warn("MONGODB_URI is not set. Skipping MongoDB connection.");
    return;
  }
  try {
    const client = new MongoClient(MONGODB_URI);
    client.on('error', (e) => {
      console.warn('Mongo client emitted error event:', e && e.message ? e.message : e);
    });
    await client.connect();
    const db = client.db(DB_NAME);
    moodLogsCollection = db.collection(COLLECTION_MOOD_LOGS);
    userSettingsCollection = db.collection(COLLECTION_USER_SETTINGS);
    usersCollection = db.collection(COLLECTION_USERS); // Initialize users collection

    // Create unique index for username
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    console.log("✅ Connected to MongoDB and collections");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
  }
}
connectMongo();

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized', message: 'You must be logged in to access this resource.' });
}

// ---------- AUTHENTICATION ENDPOINTS ----------
// Signup
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash password

        try {
            const result = await usersCollection.insertOne({ username, passwordHash: hashedPassword });
            req.session.user = { id: result.insertedId, username }; // Log in user immediately
            return res.status(201).json({ success: true, message: "User registered and logged in.", user: { id: result.insertedId, username } });
        } catch (error) {
            if (error.code === 11000) { // Duplicate key error
                return res.status(409).json({ error: "Username already exists." });
            }
            throw error;
        }
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Failed to register user." });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        req.session.user = { id: user._id, username: user.username }; // Store user info in session
        return res.json({ success: true, message: "Logged in successfully.", user: { id: user._id, username: user.username } });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Failed to log in." });
    }
});

// Logout
app.post("/api/auth/logout", isAuthenticated, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ error: "Failed to log out." });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.json({ success: true, message: "Logged out successfully." });
    });
});

// Get Session (check if logged in)
app.get("/api/auth/session", (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ isLoggedIn: true, user: req.session.user });
    }
    res.json({ isLoggedIn: false });
});

// Change Password
app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "Old password and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters long." });
        }

        const userId = req.session.user.id;
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }); // Use new ObjectId

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: "Incorrect old password." });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) }, // Use new ObjectId
            { $set: { passwordHash: hashedNewPassword, updatedAt: new Date() } }
        );

        res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
        console.error("Change password error:", err);
        res.status(500).json({ error: "Failed to change password." });
    }
});


// ---------- USER SETTINGS ENDPOINTS ----------
app.get("/api/settings/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    if (userSettingsCollection) {
      const settings = await userSettingsCollection.findOne({ user_id });
      if (settings) {
        return res.json(settings);
      }
    }
    // Return default or empty if not found
    return res.status(404).json({ error: "Settings not found" });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { user_id, age_group, theme } = req.body;
    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }

    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    const settingsToUpdate = {
      user_id,
      updatedAt: new Date()
    };
    if (age_group) settingsToUpdate.age_group = age_group;
    if (theme) settingsToUpdate.theme = theme;
    
    if (userSettingsCollection) {
      const result = await userSettingsCollection.updateOne(
        { user_id: user_id },
        { $set: settingsToUpdate },
        { upsert: true }
      );
      return res.json({ success: true, mongoResult: result });
    } else {
      return res.status(500).json({ error: "Database not connected" });
    }
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ---------- SPOTIFY RECOMMENDATIONS (ML ENHANCED) ----------
// Apply isAuthenticated middleware to protected routes
app.post("/api/recommendations", isAuthenticated, async (req, res) => {
  try {
    const { mood, age_group, user_id } = req.body;
    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }
    if (!mood) return res.status(400).json({ error: "Missing mood" });

    console.log(`Getting recommendations for Mood: ${mood}, Age: ${age_group}, User: ${user_id}`);

    // Get skipped tracks for the user
    let skippedTracks = [];
    if (user_id && moodLogsCollection) {
        try {
            const skippedLogs = await moodLogsCollection.find({ user_id: user_id, skipped: true }).toArray();
            skippedTracks = skippedLogs.map(log => log.spotify_id);
        } catch (e) {
            console.warn("Could not fetch skipped tracks:", e.message);
        }
    }

    // 1. Try Local Dataset First (Fast, Varied, No API Limits)
    const localTracks = mlService.getLocalRecommendations(mood, 8, skippedTracks);
    if (localTracks && localTracks.length > 0) {
        console.log(`Returning ${localTracks.length} tracks from Local Dataset.`);
        return res.json({ tracks: localTracks });
    }

    // 2. Fallback to Spotify Search (Restricted/Repetitive)
    console.log("Local dataset empty for this mood, falling back to Spotify API...");
    const tracks = await spotify.getRecommendationsByMoodAndAge(mood, age_group, skippedTracks, user_id);
    
    res.json({ tracks });
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

// ---------- ML TRAINING ENDPOINT ----------
app.post("/api/train", isAuthenticated, async (req, res) => { // Protect this route
  try {
    console.log("Triggering ML model training...");
    const model = await mlService.trainModel();
    res.json({ success: true, message: "Model trained successfully", modelSummary: Object.keys(model).length + " groups trained" });
  } catch (err) {
    console.error("Training error:", err);
    res.status(500).json({ error: "Failed to train model" });
  }
});

app.get("/api/search", isAuthenticated, async (req, res) => { // Protect this route
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
app.post("/api/log", isAuthenticated, async (req, res) => { // Protect this route
  try {
    const {
      user_id = "guest",
      mood,
      age_group,
      spotify_id,
      listened,
      play_seconds,
      track_name,
      artist_name,
    } = req.body;

    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }

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
      track_name,
      artist_name,
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

app.patch("/api/log/:id", isAuthenticated, async (req, res) => { // Protect this route
  try {
    const { id } = req.params;
    const { play_seconds, listened } = req.body;
    
    // Convert to ObjectId if possible (for Mongo)
    let mongoId = id;
    try {
      if(id.length === 24) { // Basic ObjectId check
         mongoId = new ObjectId(id);
      }
    } catch(e) {}

    if (moodLogsCollection) {
      try {
        // Find log to ensure ownership before updating
        const log = await moodLogsCollection.findOne({ _id: mongoId });
        if (!log || log.user_id !== req.session.user.username) {
            return res.status(403).json({ error: "Forbidden", message: "Access denied or log not found." });
        }

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
        // Ensure local log also belongs to the user
        if (logs[logIndex].user_id === req.session.user.username) {
            if (play_seconds !== undefined) logs[logIndex].play_seconds = play_seconds;
            if (listened !== undefined) logs[logIndex].listened = listened;
            saveLocalLogs(logs);
        }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update mood log" });
  }
});

app.post("/api/log/skip", isAuthenticated, async (req, res) => { // Protect this route
  try {
    const { user_id, spotify_id } = req.body;

    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }

    if (!user_id || !spotify_id) {
      return res.status(400).json({ error: "user_id and spotify_id are required" });
    }

    let updatedIn = "none";

    // Update in MongoDB
    if (moodLogsCollection) {
      try {
        const lastLog = await moodLogsCollection.findOne(
            { user_id, spotify_id },
            { sort: { created_at: -1 } }
        );

        if (lastLog) {
            const result = await moodLogsCollection.updateOne(
              { _id: lastLog._id },
              { $set: { skipped: true, updatedAt: new Date() } }
            );
            if (result.modifiedCount > 0) {
                updatedIn = "mongo";
            }
        }
      } catch (e) {
        console.warn("MongoDB skip update failed:", e.message);
      }
    }

    // Update in local file as a fallback
    if (updatedIn === "none") {
        const logs = loadLocalLogs();
        // Find the last matching log
        for (let i = logs.length - 1; i >= 0; i--) {
            if (logs[i].user_id === user_id && logs[i].spotify_id === spotify_id) {
                logs[i].skipped = true;
                logs[i].updatedAt = new Date();
                saveLocalLogs(logs);
                updatedIn = "local";
                break;
            }
        }
    }

    res.json({ success: true, source: updatedIn });
  } catch (err) {
    console.error("Skip log error:", err);
    res.status(500).json({ error: "Failed to save skip log" });
  }
});


app.post("/api/feedback", isAuthenticated, async (req, res) => { // Protect this route
  try {
    const { user_id, spotify_id, feedback } = req.body;

    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }

    if (!user_id || !spotify_id || !feedback) {
      return res.status(400).json({ error: "user_id, spotify_id, and feedback are required" });
    }
    
    if (!['like', 'dislike'].includes(feedback)) {
      return res.status(400).json({ error: "Feedback must be 'like' or 'dislike'" });
    }

    let updatedIn = "none";

    // Update in MongoDB
    if (moodLogsCollection) {
      try {
        const lastLog = await moodLogsCollection.findOne(
            { user_id, spotify_id },
            { sort: { created_at: -1 } }
        );

        if (lastLog) {
            const result = await moodLogsCollection.updateOne(
              { _id: lastLog._id },
              { $set: { feedback: feedback, updatedAt: new Date() } }
            );
            if (result.modifiedCount > 0) {
                updatedIn = "mongo";
            }
        }
      } catch (e) {
        console.warn("MongoDB feedback update failed:", e.message);
      }
    }

    // Update in local file as a fallback
    if (updatedIn === "none") {
        const logs = loadLocalLogs();
        // Find the last matching log
        for (let i = logs.length - 1; i >= 0; i--) {
            if (logs[i].user_id === user_id && logs[i].spotify_id === spotify_id) {
                logs[i].feedback = feedback;
                logs[i].updatedAt = new Date();
                saveLocalLogs(logs);
                updatedIn = "local";
                break;
            }
        }
    }

    res.json({ success: true, source: updatedIn });
  } catch (err) {
    console.error("Feedback log error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});



// ---------- GET RECENT LOGS (DEBUG) ----------

app.get("/api/log", isAuthenticated, async (req, res) => { // Protect this route
  try {
    let rows = [];
    let source = "local";

    if (moodLogsCollection) {
      try {
        rows = await moodLogsCollection
          .find({ user_id: req.session.user.username }) // Only fetch current user's logs
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
      rows = loadLocalLogs().filter(l => l.user_id === req.session.user.username).slice(0, 20);
    }

    res.json({ logs: rows, source: source });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

app.get("/api/moods/:user_id", isAuthenticated, async (req, res) => { // Protect this route
  try {
    const { user_id } = req.params;
    // Ensure user_id from session matches requested user_id for security
    if (!req.session.user || req.session.user.username !== user_id) {
      return res.status(403).json({ error: "Forbidden", message: "Access denied." });
    }

    let logs = [];
    let source = "local";

    if (moodLogsCollection) {
      try {
        logs = await moodLogsCollection.find({ user_id }).sort({ created_at: -1 }).toArray();
        source = "mongo";
      } catch (e) {
        console.warn("MongoDB query failed, using local fallback:", e.message);
      }
    }

    // Fallback to local file
    if (source === "local") {
      const allLogs = loadLocalLogs();
      logs = allLogs.filter(l => l.user_id === user_id);
    }

    res.json({ logs, source });
  } catch (err) {
    console.error("Fetch mood history error:", err);
    res.status(500).json({ error: "Failed to fetch mood history" });
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