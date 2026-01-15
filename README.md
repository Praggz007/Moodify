# 🎵 Moodify — ML-Powered Mood-Based Music Recommendation System

Moodify is a full-stack music recommendation application that suggests songs based on a user’s mood, age group, and listening behavior.  
It combines machine learning, Spotify Web API, and user feedback to deliver personalized and adaptive music recommendations.

---

## 🚀 Key Features

### 🎭 Mood-Based Recommendations
Users select a mood:
- Happy
- Sad
- Calm
- Energetic
- Stressed

Music is recommended using emotional audio features:
- Valence
- Energy
- Danceability
- Tempo
- Acousticness

---

### 🧠 Machine Learning–Driven Personalization
- Uses unsupervised learning
- Centroid-based clustering (K-Means style averaging)
- Learns from:
  - Songs users listened to
  - Likes / dislikes
  - Skipped tracks
- Generates personalized audio-feature targets for:
  - User + Mood + Age Group
- Model trained using real Spotify audio features

---

### 👤 User Authentication & Sessions
- Secure signup / login system
- Passwords hashed using bcrypt
- Persistent login using MongoDB-backed sessions
- Users can:
  - Change password
  - Store personal settings
  - View mood history

---

### 🎧 Spotify Integration (with Smart Fallbacks)
- Uses Spotify Web API for:
  - Recommendations
  - Search
  - Audio feature extraction
- Smart fallback system:
  - Switches to local dataset when API limits are hit
  - Ensures the app always works

---

### 📊 Feedback-Aware Recommendations
Tracks:
- Listen duration
- Skipped songs
- Likes / dislikes

Behavior impact:
- Skipped or disliked tracks are automatically avoided
- Liked songs influence ML training more heavily

---

### 🗄️ Robust Data Storage
- Primary: MongoDB
- Fallback: Local JSON storage
- App works even if MongoDB or Spotify is unavailable

---

## 🧠 Machine Learning Approach

| Aspect | Details |
|------|--------|
| ML Type | Unsupervised Learning |
| Algorithm | Centroid-based clustering |
| Training | Offline / batch |
| Feedback | Implicit (likes, skips) |
| Features Used | Valence, Energy, Danceability, Acousticness, Tempo |
| Model Storage | model_centroids.json |

Each centroid represents the average musical preference of a user for a given mood and age group.

---

## 🏗️ Project Architecture

Moodify/
- server.js – Express backend, auth, APIs  
- spotify.js – Spotify API integration  
- ml-service.js – ML training & prediction logic  
- db.js – MongoDB connection helper  
- public/ – Frontend (HTML, CSS, JS)  
- model_centroids.json – Trained ML model  
- mood_logs_local.json – Local fallback logs  
- package.json  
- README.md  

---

## 🔄 Application Flow
1. User logs in
2. User selects mood and age group
3. Backend:
   - Filters skipped tracks
   - Queries ML model
   - Fetches Spotify recommendations using ML targets
4. User interactions are logged
5. ML model retrains using updated data

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Local JSON fallback

### Machine Learning
- Centroid-based clustering
- Spotify Audio Features

### APIs
- Spotify Web API

---

## ⚙️ Setup Instructions

### 1️⃣Clone the Repository
```bash
git clone https://github.com/Praggz007/Moodify.git
cd Moodify
```
2️⃣Install Dependencies
```bash
npm install
```
3️⃣Environment Variables
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
MONGODB_URI=your_mongodb_uri
SESSION_SECRET=your_session_secret
```

4️⃣Run the Server
```bash
node server.js
```

## 📈 Future Enhancements
- Real-time emotion detection (text / facial analysis)
- Deep learning–based recommendation models
- Playlist generation & Spotify playlist export
- React-based frontend
- Collaborative filtering

---

## 🎓 Academic Relevance
This project demonstrates:
- Real-world ML integration
- Applied unsupervised learning
- Secure backend development
- API-driven system design
- Fault-tolerant architecture

---

## 👨‍💻 Authors
- **Pragyan Jyoti Gogoi**
- **Nandini Biswal**

---

## ⭐ Why This Project Stands Out
✔ Real ML usage (not hard-coded logic)  
✔ Feedback-driven personalization  
✔ Production-ready backend design  
✔ Works even without external APIs  
✔ Clear separation of concerns  

