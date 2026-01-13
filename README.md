# COLLEGE-PROJECT

## Local server / Spotify proxy

This project includes a small Node.js server (`server.js`) that acts as a proxy
to the Spotify Web API and provides a couple of helpful endpoints the frontend
uses:

- `POST /api/recommendations` — accepts JSON `{ mood, age_group }` and returns
	a `tracks` array. If Spotify client credentials are configured, the server
	forwards the request to Spotify recommendations; otherwise a small set of
	mock tracks is returned so the UI still works in demo mode.
- `GET /api/search?q=...` — performs a Spotify search and returns matching
	tracks.

### Environment variables

Set these in your environment before running the server (PowerShell example):

```powershell
$env:SPOTIFY_CLIENT_ID = "your_spotify_client_id"
$env:SPOTIFY_CLIENT_SECRET = "your_spotify_client_secret"
# Optional: service role key for Supabase logging
$env:SUPABASE_SERVICE_ROLE_KEY = "your_supabase_service_role_key"
node server.js
```

If `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are not set the server will
start and serve a mock `POST /api/recommendations` response so you can test
the frontend without Spotify credentials.

### Quick test

Run the server and test the recommendations endpoint with `curl` (or Postman):

```bash
curl -X POST http://localhost:3001/api/recommendations \
	-H "Content-Type: application/json" \
	-d '{"mood":"happy","age_group":"18-25"}'
```

The response is JSON: `{ "tracks": [ ... ] }`.
