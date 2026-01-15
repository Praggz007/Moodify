🎵 Moodify — ML‑Powered Mood‑Based Music Recommendation System
Moodify is a full‑stack music recommendation application that suggests songs based on a user’s mood, age group, and listening behavior.
It combines machine learning, Spotify Web API, and user feedback to deliver personalized and adaptive music recommendations.

🚀 Key Features
🎭 Mood‑Based Recommendations
Users select a mood (happy, sad, calm, energetic, stressed)

Music is recommended based on emotional audio features like:

valence

energy

danceability

tempo

🧠 Machine Learning–Driven Personalization
Uses unsupervised learning (centroid‑based clustering)

Learns from:

songs users listened to

likes / dislikes

skipped tracks

Generates personalized audio‑feature targets for each:

user + mood + age group
📌 Model is trained using real Spotify audio features.

👤 User Authentication & Sessions
Secure signup / login system

Passwords hashed using bcrypt

Persistent login using MongoDB‑backed sessions

Users can:

change password

store personal settings

view their mood history

🎧 Spotify Integration (with Smart Fallbacks)
Uses Spotify Web API for:

recommendations

search

audio feature extraction

If API limits are hit:

switches to local dataset recommendations

ensures the app always works

📊 Feedback‑Aware Recommendations
Tracks:

listen duration

skipped songs

likes / dislikes

Skipped or disliked tracks are automatically avoided

Liked songs have more influence during ML training

🗄️ Robust Data Storage
Primary: MongoDB (users, sessions, logs)

Fallback: Local JSON storage

App works even if MongoDB or Spotify is unavailable

🧠 Machine Learning Approach
Aspect	Details
ML Type	Unsupervised Learning
Algorithm	Centroid‑based (K‑Means‑style averaging)
Training	Offline / batch
Feedback	Implicit (likes, skips)
Features Used	Valence, Energy, Danceability, Acousticness, Tempo
Model Storage	model_centroids.json
Each centroid represents the average musical preference of a user for a given mood and age group.

🏗️ Project Architecture
Moodify/
│
├── server.js           # Express backend, auth, APIs
├── spotify.js          # Spotify API integration
├── ml-service.js       # ML training & prediction logic
├── db.js               # MongoDB connection helper
├── public/             # Frontend (HTML, CSS, JS)
├── model_centroids.json# Trained ML model
├── mood_logs_local.json# Local fallback logs
├── package.json
└── README.md
🔄 Application Flow
User logs in

User selects mood + age group

Backend:

checks skipped tracks

queries ML model

Spotify recommendations are fetched using ML‑generated targets

User interactions are logged

ML model retrains using updated data

🛠️ Tech Stack
Frontend

HTML, CSS, JavaScript

Backend

Node.js

Express.js

Database

MongoDB

Local JSON fallback

Machine Learning

Centroid‑based clustering

Spotify Audio Features

APIs

Spotify Web API

⚙️ Setup Instructions
1️⃣ Clone the Repository
git clone https://github.com/Praggz007/Moodify.git
cd Moodify
2️⃣ Install Dependencies
npm install
3️⃣ Environment Variables
Create a .env file:

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
MONGODB_URI=your_mongodb_uri
SESSION_SECRET=your_session_secret
4️⃣ Run the Server
node server.js
📈 Future Enhancements
Real‑time emotion detection (text / facial analysis)

Deep learning–based recommendation models

Playlist generation & Spotify playlist export

React‑based frontend

Collaborative filtering

🎓 Academic Relevance
This project demonstrates:

Real‑world ML integration

Applied unsupervised learning

Secure backend development

API‑driven system design

Fault‑tolerant architecture

👨‍💻 Authors
Pragyan Jyoti Gogoi

Nandini Biswal

⭐ Why This Project Stands Out
✔ Real ML usage (not hard‑coded logic)
✔ Feedback‑driven personalization
✔ Production‑ready backend design
✔ Works even without external APIs
✔ Clear separation of concerns
