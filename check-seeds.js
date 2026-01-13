require("dotenv").config();
const fetch = require("node-fetch");

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyToken() {
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  const data = await tokenRes.json();
  return data.access_token;
}

async function checkSeeds() {
  try {
    const token = await getSpotifyToken();
    console.log("Token obtained.");

    // Check Audio Features (using a known track ID)
    // Track: "Shape of You" - 7qiZfU4dY1lWllzX7mPBI3
    console.log("--- Checking Audio Features ---");
    const afRes = await fetch("https://api.spotify.com/v1/audio-features?ids=7qiZfU4dY1lWllzX7mPBI3", {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Audio Features Status: ${afRes.status} ${afRes.statusText}`);
    const afText = await afRes.text();
    console.log("Response:", afText);

  } catch (err) {
      console.error("Error:", err);
  }
}

checkSeeds();
