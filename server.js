// Minimal Node server to proxy Spotify search using Client Credentials
// Usage: set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in env, then `node server.js`

require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.warn('Warning: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set. API will fail until provided.');
}

async function getSpotifyToken() {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${creds}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Token request failed: ${res.status} ${res.statusText} - ${txt}`);
  }
  const data = await res.json();
  return data.access_token;
}

// GET /api/search?q=comfort
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Missing q query parameter' });

    const token = await getSpotifyToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=8`;
    const apiRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!apiRes.ok) {
      const txt = await apiRes.text();
      return res.status(apiRes.status).json({ error: txt });
    }
    const data = await apiRes.json();
    return res.json({ tracks: data.tracks && data.tracks.items ? data.tracks.items : [] });
  } catch (err) {
    console.error('Error in /api/search', err);
    return res.status(500).json({ error: err.message });
  }
});

// Serve static files AFTER API routes
app.use(express.static(path.join(__dirname, '')));

app.listen(PORT, () => {
  console.log(`Spotify proxy server listening on http://localhost:${PORT}`);
});
