require("dotenv").config();
const fetch = require("node-fetch");

async function testSpotifyConnection() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ Missing Client ID or Secret in .env");
    return;
  }

  console.log("Testing Spotify connection...");
  console.log(`Client ID: ${clientId.substring(0, 4)}...`);
  
  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error(`❌ Spotify API Error (${tokenRes.status}):`, txt);
    } else {
      const data = await tokenRes.json();
      if (data.access_token) {
        console.log("✅ Success! Access Token received.");
        console.log("Token starts with:", data.access_token.substring(0, 10) + "...");
      } else {
        console.error("❌ Response OK but no access_token found:", data);
      }
    }
  } catch (err) {
    console.error("❌ Network or Script Error:", err);
  }
}

testSpotifyConnection();
