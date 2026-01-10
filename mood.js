// mood.js — Complete frontend logic for Moodify
(function(){
  // --- CONFIGURATION ---
  const API_FALLBACK = 'http://localhost:3002';
  
  function getApiBase(){
    try{
      const origin = window.location.origin;
      if (origin && origin !== 'null' && !origin.startsWith('file:')) {
         // Check if we are on a different port than the API (e.g. live-server on 8080)
         const loc = window.location;
         const port = loc.port ? parseInt(loc.port, 10) : (loc.protocol === 'https:' ? 443 : 80);
         const fallbackPort = (new URL(API_FALLBACK)).port || '3002';
         if (String(port) !== String(fallbackPort)) return API_FALLBACK;
         return origin;
      }
    }catch(e){}
    return API_FALLBACK;
  }

  // --- DATA: MOODS & ACTIVITIES ---
  const MOODS = [
    {id:'happy', label:'Happy', emoji:'😄', color:'#FFD54F'},
    {id:'sad', label:'Sad', emoji:'😢', color:'#64B5F6'},
    {id:'calm', label:'Calm', emoji:'😌', color:'#80CBC4'},
    {id:'energetic', label:'Energetic', emoji:'🔥', color:'#EF5350'},
    {id:'stressed', label:'Stressed', emoji:'😫', color:'#B0BEC5'}
  ];

  const moodToActivities = {
    happy: ["Dance to a Bollywood hit!","Call a friend for a chai","Go for a sunny walk","Watch a comedy clip"],
    energetic: ["Do a 10-min Bhangra workout","Go for a run","Clean your room to fast beats","Do a cycling sprint"],
    calm: ["Enjoy a quiet cup of tea","Read a book by the window","Do some gentle stretching","Listen to old classics"],
    sad: ["Write your feelings in a journal","Take a long warm shower","Wrap yourself in a blanket","Watch a comforting movie"],
    stressed: ["Take 3 deep breaths","Drink some water","Step outside for fresh air","Close your eyes for 5 mins"]
  };

  const ageActivities = {
    happy: {
      "13-17": ["Keep the vibe alive! Make a fun Reel/TikTok.", "Level up the fun! Game with friends.", "Stay sweet. Go get ice cream."],
      "18-25": ["Make memories! Plan a weekend trip.", "Treat yourself. Go for a coffee run.", "Be bold! Text your crush."],
      "26-35": ["Savor the moment. Cook a nice meal.", "You deserve it. Take a break from work.", "Reconnect. Call an old friend."],
      "36-50": ["Cherish the time. Enjoy family moments.", "Clear your head. Go for a long drive.", "Get creative. Try a new recipe."],
      "50+":   ["Simple joys. Relax in the garden.", "Family first. Call the grandkids.", "Nostalgia trip. Listen to radio hits."]
    },
    energetic: {
      "13-17": ["Get moving! Play sports outside.", "Show your moves! Learn a viral dance.", "Speed up! Skate or cycle."],
      "18-25": ["Beast mode! Hit the gym.", "Clear your mind. Go for a run.", "Fresh start. Cleaning spree!"],
      "26-35": ["Stay active. Quick home workout.", "Get some air. Go for a jog.", "Productivity boost! Tackle that to-do list."],
      "36-50": ["Active living. Walk the dog briskly.", "Nature time. Do some gardening.", "Find flow. Yoga session."],
      "50+":   ["Healthy start. Morning walk.", "Stay flexible. Light stretching.", "Find balance. Gentle Yoga."]
    },
    calm: {
      "13-17": ["Unleash creativity. Draw or doodle.", "Chill vibes. Listen to a podcast.", "Recharge. Nap time."],
      "18-25": ["Find your center. Meditate for 10 mins.", "Escape reality. Read a new book.", "Log off. Digital detox."],
      "26-35": ["Warm up. Drink herbal tea.", "Cozy vibes. Light a candle.", "Focus mode. Listen to instrumental."],
      "36-50": ["Stay informed. Read the newspaper.", "Peaceful evening. Go for a walk.", "Quiet time. Sit on the balcony."],
      "50+":   ["Inner peace. Prayer/Meditation.", "Sharpen the mind. Solve a crossword.", "Nature's beauty. Watch the birds."]
    },
    sad: {
      "13-17": ["It's okay. Watch a comfort show.", "Puppy love. Hug a pet.", "Feel the feels. Listen to sad songs."],
      "18-25": ["Let it out. Journal your thoughts.", "Reach out. Call your best friend.", "Comfort first. Order your fav food."],
      "26-35": ["Self-care. Take a mental health day.", "Escape. Watch a movie.", "Unplug. Disconnect for an hour."],
      "36-50": ["Share the load. Talk to a friend.", "Warm the soul. Cook comfort food.", "Just breathe. Rest."],
      "50+":   ["Memory lane. Look at old photos.", "Take it easy. Rest and recover.", "Connect. Call a family member."]
    },
    stressed: {
      "13-17": ["Pause. Take a break from homework.", "Distract yourself. Play a relaxing game.", "Breathe deep. 4-7-8 breathing."],
      "18-25": ["Unplug. Step away from screens.", "Move a bit. Go for a walk.", "Release tension. Stretch."],
      "26-35": ["Work can wait. Close the laptop.", "Sip and relax. Make a chai.", "Reset. 5-min meditation."],
      "36-50": ["Silence is golden. Sit quietly.", "Ground yourself. Gardening break.", "Tea time. Brew a fresh cup."],
      "50+":   ["Fresh air. Sit outside.", "Soothing sounds. Listen to bhajans.", "Rest your eyes. Short nap."]
    }
  };

  // --- UI ELEMENTS ---
  const moodGrid = document.getElementById('moodGrid');
  const savingEl = document.getElementById('saving');
  const loginScreen = document.getElementById('login');
  const home = document.getElementById('home');
  const rec = document.getElementById('rec');
  const songEl = document.getElementById('song');
  const activityEl = document.getElementById('activity');
  const recMood = document.getElementById('recMood');
  const backBtn = document.getElementById('backBtn');
  const ageGroupSelect = document.getElementById('ageGroupSelect');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const themeSelect = document.getElementById('themeSelect');
  const player = document.getElementById('player');
  const toastEl = document.getElementById('toast');

  // --- STATE ---
  let currentUser = null;
  let toastTimer = null;

  // --- HELPER FUNCTIONS ---
  function showToast(message, type = 'info', duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = String(message);
    toastEl.className = 'toast show ' + (type === 'warn' ? 'warn' : 'info');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
      toastTimer = null;
    }, duration);
  }

  // --- THEME LOGIC ---
  function initTheme() {
    const savedTheme = localStorage.getItem('moodify_theme') || 'light';
    if (themeSelect) {
        themeSelect.value = savedTheme;
        document.body.setAttribute('data-theme', savedTheme);

        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('moodify_theme', newTheme);
        });
    }
  }

  function pickActivity(mood, age){
    // Try to find age-specific activity
    if (age && ageActivities[mood] && ageActivities[mood][age]) {
        const specific = ageActivities[mood][age];
        return specific[Math.floor(Math.random() * specific.length)];
    }
    // Fallback to generic
    const list = moodToActivities[mood] || ["Take a break"];
    return list[Math.floor(Math.random()*list.length)];
  }

  // --- AUTH LOGIC ---
  function saveUserSession(username) {
    const session = { username, token: 'session_' + Date.now(), loggedInAt: new Date().toISOString() };
    localStorage.setItem('moodify_session', JSON.stringify(session));
    currentUser = session;
  }
  function getUserSession() {
    const raw = localStorage.getItem('moodify_session');
    return raw ? JSON.parse(raw) : null;
  }
  function clearUserSession() { localStorage.removeItem('moodify_session'); }

  function showLoginScreen() {
    if(loginScreen) loginScreen.style.display = 'block';
    if(home) home.style.display = 'none';
    if(rec) rec.style.display = 'none';
    if(loginUsername) { loginUsername.value = ''; loginUsername.focus(); }
    if(loginPassword) loginPassword.value = '';
  }
  function showHomeScreen() {
    if(loginScreen) loginScreen.style.display = 'none';
    if(home) home.style.display = 'block';
    if(rec) rec.style.display = 'none';
    
    // Update welcome name
    const userDisplay = document.getElementById('userDisplay');
    if(userDisplay && currentUser) userDisplay.textContent = currentUser.username;
  }

  function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) return showToast('Enter username & password', 'warn');
    if (username.length < 3) return showToast('Username too short', 'warn');
    
    saveUserSession(username);
    showToast(`Welcome, ${username}!`, 'info');
    showHomeScreen();
  }
  function handleLogout() {
    clearUserSession();
    currentUser = null;
    showToast('Logged out', 'info');
    showLoginScreen();
  }

  // --- MAIN APP LOGIC ---
  async function getRecommendations(mood, age){
    const base = getApiBase();
    try{
      const res = await fetch(`${base}/api/recommendations`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mood, age_group: age })
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.tracks || [];
    }catch(err){
      console.warn('Recs failed', err);
      return [];
    }
  }

  // --- MOOD VISUALS ---
  const MOOD_EMOJIS = {
    happy: ['☀️', '😂', '🎉', '🌻', '💛'],
    sad: ['🌧️', '💧', '💔', '🌫️', '🥀'],
    energetic: ['🔥', '⚡', '💃', '🚀', '💥'],
    calm: ['🍃', '🍵', '🦋', '🌊', '🧘'],
    stressed: ['🌪️', '💢', '😫', '🔌', '📉']
  };

  const MOOD_ANIMATIONS = {
    happy: 'floatUp',
    sad: 'rainDown',
    energetic: 'zoomPulse',
    calm: 'gentleFloat',
    stressed: 'shakeHard'
  };

  function createEmojiParticles(moodId, container) {
    // Clear previous
    const old = container.querySelectorAll('.emoji-particle');
    old.forEach(el => el.remove());

    const emojis = MOOD_EMOJIS[moodId] || ['✨'];
    const animation = MOOD_ANIMATIONS[moodId] || 'floatUp';
    const count = 12; // Number of particles

    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'emoji-particle';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Random Position
        el.style.left = Math.random() * 100 + '%';
        el.style.top = Math.random() * 100 + '%';
        
        // Random Animation Props
        const duration = 2 + Math.random() * 3; // 2-5s
        const delay = Math.random() * 2;
        el.style.animation = `${animation} ${duration}s linear infinite`;
        el.style.animationDelay = `-${delay}s`; // Start immediately
        
        container.appendChild(el);
    }
  }

  async function onMoodTap(moodObj) {
    const moodId = moodObj.id;
    const ageGroup = ageGroupSelect.value;

    if (!ageGroup) {
        showToast('Please select an age group', 'warn');
        return;
    }

    if(savingEl) savingEl.style.display = 'block';
    
    // 1. Get Activity Text (Now contains the full custom message)
    const activityText = pickActivity(moodId, ageGroup);

    // 2. Get Song
    let track = null;
    try {
        const tracks = await getRecommendations(moodId, ageGroup);
        if(tracks && tracks.length > 0) track = tracks[0];
    } catch(e) { console.warn('Fetch error', e); }

    // 3. Update UI
    if(recMood) {
        recMood.textContent = moodObj.label;
        recMood.style.color = ''; // Reset inline color to let CSS take over
    }
    
    // Update Mood Banner Visually
    const banner = document.getElementById('moodBanner');
    if(banner) {
        // Reset classes
        banner.className = 'card'; 
        // Add specific class
        banner.classList.add(`banner-${moodId}`);
        // Inject Emojis
        createEmojiParticles(moodId, banner);
    }

    if(activityEl) activityEl.textContent = activityText;
    
    if(songEl) {
        songEl.textContent = track ? `${track.name} – ${track.artists[0].name}` : "No song found (Check connection)";
    }

    if(player) {
        player.innerHTML = '';
        if(track) {
            if(track.preview_url) {
                const audio = document.createElement('audio');
                audio.controls = true; audio.src = track.preview_url; audio.autoplay = true;
                player.appendChild(audio);
            } else if(track.id) {
                const iframe = document.createElement('iframe');
                iframe.src = `https://open.spotify.com/embed/track/${track.id}`;
                iframe.width = '100%'; iframe.height = '80'; iframe.frameBorder = '0';
                iframe.allow = 'clipboard-write; encrypted-media; fullscreen; picture-in-picture';
                player.appendChild(iframe);
            }
        }
    }

    // 4. Show Rec Screen
    if(home) home.style.display = 'none';
    if(rec) rec.style.display = 'block';
    if(savingEl) savingEl.style.display = 'none';

    // 5. Log to Server
    const payload = {
        user_id: currentUser ? currentUser.username : 'guest',
        mood: moodId,
        age_group: ageGroup,
        note: `Activity: ${activityText}`,
        created_at: new Date()
    };
    if(track) {
        payload.spotify_id = track.id;
        payload.track_name = track.name;
    }

    try {
        fetch(`${getApiBase()}/api/log`, {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
    } catch(e){}
  }

  // --- INITIALIZATION ---
  function init() {
    initTheme();

    // Auth Check
    const session = getUserSession();
    if(session) { currentUser = session; showHomeScreen(); }
    else { showLoginScreen(); }

    // Bind Auth Events
    if(loginBtn) loginBtn.addEventListener('click', handleLogin);
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Bind Mood Buttons
    if (moodGrid) {
        moodGrid.innerHTML = ''; // Clear existing
        MOODS.forEach(m => {
            const btn = document.createElement('div');
            btn.className = 'mood-btn'; // New Class
            btn.dataset.mood = m.id;    // For CSS styling
            // btn.style.background = m.color; // Handled by CSS now
            btn.innerHTML = `<div class="emoji">${m.emoji}</div><div class="label">${m.label}</div>`;
            btn.addEventListener('click', () => onMoodTap(m));
            moodGrid.appendChild(btn);
        });
    }

    if(backBtn) backBtn.addEventListener('click', () => {
        if(rec) rec.style.display = 'none';
        if(home) home.style.display = 'block';
        if(player) player.innerHTML = ''; // Stop audio
    });

    // PWA
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }

  // Run Init
  if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();

})();
