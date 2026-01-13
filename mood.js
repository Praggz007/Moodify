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

  // Authentication Screens
  const authScreen = document.getElementById('authScreen');
  const loginScreen = document.getElementById('login');
  const signupScreen = document.getElementById('signup');

  // Login elements
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const showLoginLink = document.getElementById('showLogin');
  const showPasswordToggle = document.getElementById('showPasswordToggle'); // Login password toggle

  // Signup elements
  const showSignupLink = document.getElementById('showSignup');
  const signupUsername = document.getElementById('signupUsername');
  const signupPassword = document.getElementById('signupPassword');
  const signupConfirmPassword = document.getElementById('signupConfirmPassword');
  const signupBtn = document.getElementById('signupBtn');
  const showSignupPasswordToggle = document.getElementById('showSignupPasswordToggle'); // Signup password toggle

  const home = document.getElementById('home');
  const rec = document.getElementById('rec');
  const songEl = document.getElementById('song');
  const activityEl = document.getElementById('activity');
  const recMood = document.getElementById('recMood');
  const backBtn = document.getElementById('backBtn');
  const ageGroupSelect = document.getElementById('ageGroupSelect'); // Home screen age group
  const logoutBtn = document.getElementById('logoutBtn');
  const themeSelect = document.getElementById('themeSelect'); // Header theme select
  const player = document.getElementById('player');
  const toastEl = document.getElementById('toast');
  const skipBtn = document.getElementById('skipBtn');
  const historyBtn = document.getElementById('historyBtn');
  const history = document.getElementById('history');
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const moodChart = document.getElementById('moodChart');
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');

  // Settings elements
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsScreen = document.getElementById('settings');
  const backFromSettingsBtn = document.getElementById('backFromSettingsBtn');
  const settingsAgeGroupSelect = document.getElementById('settingsAgeGroupSelect'); // Settings age group
  const settingsThemeSelect = document.getElementById('settingsThemeSelect'); // Settings theme select
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const oldPassword = document.getElementById('oldPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmNewPassword = document.getElementById('confirmNewPassword');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const showNewPasswordToggle = document.getElementById('showNewPasswordToggle'); // Change password toggle


  // --- STATE ---
  let currentUser = null;
  let toastTimer = null;
  let currentMood = null;
  let currentTrack = null;

  // --- HELPER FUNCTIONS ---
  async function performAuthRequest(endpoint, body) {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      return data;
    } catch (err) {
      console.error(`Auth request to ${endpoint} failed:`, err);
      showToast(err.message, 'warn');
      return null;
    }
  }

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
  function getThemeByTime() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'light';
    if (hour >= 12 && hour < 17) return 'beach';
    if (hour >= 17 && hour < 21) return 'sunset';
    return 'space';
  }

  function applyTheme(themeToApply) {
    document.body.setAttribute('data-theme', themeToApply);
    if (themeSelect) themeSelect.value = themeToApply;
    if (settingsThemeSelect) settingsThemeSelect.value = themeToApply;
  }

  function initTheme() {
    let savedTheme = localStorage.getItem('moodify_theme') || 'auto';
    if (currentUser && currentUser.settings && currentUser.settings.theme) {
      savedTheme = currentUser.settings.theme;
    }
    
    let currentTheme = savedTheme;
    if (savedTheme === 'auto') {
      currentTheme = getThemeByTime();
    }
    applyTheme(currentTheme);

    // Event listener for header theme select
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('moodify_theme', newTheme); // Keep local storage for non-logged in state
            let themeToApply = newTheme;
            if (newTheme === 'auto') {
              themeToApply = getThemeByTime();
            }
            applyTheme(themeToApply);
            // If logged in, also save to user settings
            if (currentUser) saveUserSettings(null, newTheme);
        });
    }

    // Event listener for settings theme select
    if (settingsThemeSelect) {
        settingsThemeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('moodify_theme', newTheme); // Keep local storage for non-logged in state
            let themeToApply = newTheme;
            if (newTheme === 'auto') {
              themeToApply = getThemeByTime();
            }
            applyTheme(themeToApply);
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

  // --- SCREEN NAVIGATION ---
  function showPage(pageId) {
    const pages = [authScreen, loginScreen, signupScreen, home, rec, history, settingsScreen];
    pages.forEach(page => {
        if (page) {
            page.style.display = page.id === pageId || (page.id === 'login' && pageId === 'authScreen') || (page.id === 'signup' && pageId === 'authScreen') ? 'block' : 'none';
        }
    });
  }

  function showAuthScreen() {
    if(authScreen) authScreen.style.display = 'block';
    showLoginScreen();
  }

  function showLoginScreen() {
    if(loginScreen) loginScreen.style.display = 'block';
    if(signupScreen) signupScreen.style.display = 'none';
    if(loginUsername) { loginUsername.value = ''; loginUsername.focus(); }
    if(loginPassword) loginPassword.value = '';
  }

  function showSignupScreen() {
    if(signupScreen) signupScreen.style.display = 'block';
    if(loginScreen) loginScreen.style.display = 'none';
    if(signupUsername) { signupUsername.value = ''; signupUsername.focus(); }
    if(signupPassword) signupPassword.value = '';
    if(signupConfirmPassword) signupConfirmPassword.value = '';
  }

  async function showHomeScreen() {
    showPage('home');
    if(userDisplay && currentUser) userDisplay.textContent = currentUser.username;
    await loadUserSettings(); // Load settings when home screen is shown
    initTheme(); // Re-initialize theme based on loaded settings
  }

  async function showSettingsScreen() {
    showPage('settings');
    await loadUserSettings(); // Load settings into the settings form
  }

  async function showSongHistoryPage() {
    showPage('history');
    // Update the title dynamically
    const historyTitle = history.querySelector('h2');
    if (historyTitle) historyTitle.textContent = 'Song History';

    if (!currentUser) {
        moodChart.innerHTML = '<p>Please log in to see your song history.</p>';
        return;
    }
    moodChart.innerHTML = '<p>Loading song history...</p>';

    try {
        const res = await fetch(`${getApiBase()}/api/moods/${currentUser.username}`);
        if (!res.ok) throw new Error('Failed to fetch song history');
        const { logs } = await res.json();
        renderSongHistoryList(logs);
    } catch (err) {
        moodChart.innerHTML = `<p style="color:var(--secondary)">Error: Could not load song history.</p>`;
        showToast(err.message, 'warn');
    }
  }

  function renderSongHistoryList(logs) {
    if (!logs || logs.length === 0) {
        moodChart.innerHTML = `<p>No song history found. Start exploring music!</p>`;
        return;
    }

    const historyHtml = logs.map(log => {
        const moodEmoji = MOODS.find(m => m.id === log.mood)?.emoji || '';
        const status = log.skipped ? '<span style="color: var(--secondary);">Skipped</span>' : '<span style="color: var(--primary);">Listened</span>';
        const trackName = log.track_name || log.spotify_id || 'Unknown Song';
        const artistName = log.artist_name || 'Unknown Artist';
        const createdAt = new Date(log.created_at).toLocaleString();

        let feedbackIcon = '';
        if (log.feedback === 'like') {
            feedbackIcon = '👍';
        } else if (log.feedback === 'dislike') {
            feedbackIcon = '👎';
        }

        return `
            <div class="song-history-item card">
                <div class="song-details">
                    <div class="song-title">${trackName}</div>
                    <div class="song-artist">${artistName}</div>
                </div>
                <div class="song-info">
                    <div class="song-mood">${moodEmoji} ${log.mood}</div>
                    <div class="song-status">${status} ${feedbackIcon}</div>
                    <div class="song-date">${createdAt}</div>
                </div>
            </div>
        `;
    }).join('');

    moodChart.innerHTML = `<div class="song-history-list">${historyHtml}</div>`;
  }

  // --- AUTHENTICATION HANDLERS ---
  async function checkSession() {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/session`);
      const data = await res.json();
      if (data.isLoggedIn && data.user) {
        currentUser = data.user;
        showHomeScreen();
      } else {
        showAuthScreen();
      }
    } catch (e) {
      showAuthScreen();
    }
  }

  async function handleSignup() {
    const username = signupUsername.value.trim();
    const password = signupPassword.value.trim();
    const confirmPassword = signupConfirmPassword.value.trim();

    if (!username || !password || !confirmPassword) {
      return showToast('Please fill in all fields', 'warn');
    }
    if (password !== confirmPassword) {
      return showToast('Passwords do not match', 'warn');
    }
    if (password.length < 6) {
      return showToast('Password must be at least 6 characters long', 'warn');
    }

    const data = await performAuthRequest('signup', { username, password });
    if (data && data.success) {
      currentUser = data.user;
      showToast('Account created and logged in!', 'info');
      showHomeScreen();
    }
  }

  async function handleLogin() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
      return showToast('Please enter username and password', 'warn');
    }

    const data = await performAuthRequest('login', { username, password });
    if (data && data.success) {
      currentUser = data.user;
      showToast(`Welcome, ${username}!`, 'info');
      showHomeScreen();
    }
  }

  async function handleLogout() {
    const data = await performAuthRequest('logout');
    if (data && data.success) {
      currentUser = null;
      showToast('Logged out', 'info');
      localStorage.removeItem('moodify_theme'); // Clear local theme preference
      showAuthScreen();
    }
  }

  // --- USER SETTINGS HANDLERS ---
  async function loadUserSettings() {
    if (!currentUser) return;
    try {
      const res = await fetch(`${getApiBase()}/api/settings/${currentUser.username}`);
      if (!res.ok) {
        if (res.status === 404) {
          console.log("No user settings found, using defaults.");
          currentUser.settings = {}; // Initialize empty settings
          return;
        }
        throw new Error('Failed to load user settings');
      }
      const settings = await res.json();
      currentUser.settings = settings;

      // Apply settings to UI
      if (ageGroupSelect && settings.age_group) ageGroupSelect.value = settings.age_group;
      if (settingsAgeGroupSelect && settings.age_group) settingsAgeGroupSelect.value = settings.age_group;
      if (settingsThemeSelect && settings.theme) {
        settingsThemeSelect.value = settings.theme;
        // Also update the main theme select
        if (themeSelect) themeSelect.value = settings.theme;
        applyTheme(settings.theme === 'auto' ? getThemeByTime() : settings.theme);
      }
    } catch (err) {
      console.warn("Error loading user settings:", err.message);
      showToast('Could not load settings', 'warn');
      currentUser.settings = {}; // Fallback to empty settings on error
    }
  }

  async function saveUserSettings(age_group = null, theme = null) {
    if (!currentUser) {
      showToast('Please log in to save settings', 'warn');
      return;
    }
    
    // Use values from form if not explicitly passed
    const ageToSave = age_group || (settingsAgeGroupSelect ? settingsAgeGroupSelect.value : '');
    const themeToSave = theme || (settingsThemeSelect ? settingsThemeSelect.value : (themeSelect ? themeSelect.value : 'auto'));

    try {
      const res = await fetch(`${getApiBase()}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.username,
          age_group: ageToSave,
          theme: themeToSave
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      
      showToast('Settings saved!', 'info');
      // Update current user's settings in state
      currentUser.settings = { ...currentUser.settings, age_group: ageToSave, theme: themeToSave };
      
      // Re-apply theme if it was updated
      if (themeToSave) applyTheme(themeToSave === 'auto' ? getThemeByTime() : themeToSave);

    } catch (err) {
      console.error("Error saving user settings:", err);
      showToast(err.message, 'warn');
    }
  }

  async function handleChangePassword() {
    if (!currentUser) return showToast('Please log in to change password', 'warn');

    const oldP = oldPassword.value.trim();
    const newP = newPassword.value.trim();
    const confirmNewP = confirmNewPassword.value.trim();

    if (!oldP || !newP || !confirmNewP) {
      return showToast('Please fill in all password fields', 'warn');
    }
    if (newP !== confirmNewP) {
      return showToast('New passwords do not match', 'warn');
    }
    if (newP.length < 6) {
      return showToast('New password must be at least 6 characters long', 'warn');
    }
    if (oldP === newP) {
      return showToast('New password cannot be the same as old password', 'warn');
    }

    const data = await performAuthRequest('change-password', { oldPassword: oldP, newPassword: newP });
    if (data && data.success) {
      showToast('Password changed successfully!', 'info');
      // Clear password fields
      oldPassword.value = '';
      newPassword.value = '';
      confirmNewPassword.value = '';
    }
  }

  // --- GENERAL APP LOGIC (UNCHANGED) ---
  async function sendFeedback(feedback) {
    if (!currentTrack || !currentUser) return;

    showToast('Thanks for your feedback!', 'info');
    
    if(likeBtn) likeBtn.disabled = true;
    if(dislikeBtn) dislikeBtn.disabled = true;

    try {
      await fetch(`${getApiBase()}/api/feedback`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: currentUser.username,
          spotify_id: currentTrack.id,
          feedback: feedback
        })
      });
    } catch (err) {
      console.warn('Feedback submission failed', err);
      if(likeBtn) likeBtn.disabled = false;
      if(dislikeBtn) dislikeBtn.disabled = false;
    }
  }

  async function getRecommendations(mood, age, userId){
    const base = getApiBase();
    try{
      const res = await fetch(`${base}/api/recommendations`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ mood, age_group: age, user_id: userId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Failed to get recommendations');
      }
      const json = await res.json();
      return json.tracks || [];
    }catch(err){
      console.warn('Recs failed', err);
      showToast(err.message, 'warn');
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

  async function onSkipTap() {
    if (!currentTrack || !currentUser) return;

    showToast('Skipping...');

    try {
      fetch(`${getApiBase()}/api/log/skip`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user_id: currentUser.username,
          spotify_id: currentTrack.id
        })
      });
    } catch(e) {
      console.warn('Skip log failed', e);
    }

    await onMoodTap(currentMood);
  }

  async function onMoodTap(moodObj) {
    const moodId = moodObj.id;
    // Use age group from home screen or current settings
    const ageGroup = ageGroupSelect.value || (currentUser.settings ? currentUser.settings.age_group : '');

    if (!ageGroup) {
        showToast('Please select an age group in settings', 'warn');
        return;
    }

    if(savingEl) savingEl.style.display = 'block';
    
    // 1. Get Activity Text
    const activityText = pickActivity(moodId, ageGroup);

    // 2. Get Song
    let track = null;
    try {
        const tracks = await getRecommendations(moodId, ageGroup, currentUser.username);
        if(tracks && tracks.length > 0) track = tracks[0];
    } catch(e) { console.warn('Fetch error', e); }

    currentMood = moodObj;
    currentTrack = track;

    // 3. Update UI
    if(recMood) {
        recMood.textContent = moodObj.label;
        recMood.style.color = '';
    }
    
    const banner = document.getElementById('moodBanner');
    if(banner) {
        banner.className = 'card'; 
        banner.classList.add(`banner-${moodId}`);
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
            if (skipBtn) skipBtn.style.display = 'block';
            if (likeBtn) {
              likeBtn.style.display = 'block';
              likeBtn.disabled = false;
            }
            if (dislikeBtn) {
              dislikeBtn.style.display = 'block';
              dislikeBtn.disabled = false;
            }
        } else {
            if (skipBtn) skipBtn.style.display = 'none';
            if (likeBtn) likeBtn.style.display = 'none';
            if (dislikeBtn) dislikeBtn.style.display = 'none';
        }
    }

    showPage('rec');
    if(savingEl) savingEl.style.display = 'none';

    // 5. Log to Server
    const payload = {
        user_id: currentUser.username,
        mood: moodId,
        age_group: ageGroup,
        note: `Activity: ${activityText}`,
        created_at: new Date()
    };
    if(track) {
        payload.spotify_id = track.id;
        payload.track_name = track.name;
        payload.artist_name = track.artists[0].name;
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
    // Initial theme setup (will be overridden by user settings if logged in)
    initTheme();

    // Check session on load
    checkSession();

    // --- AUTHENTICATION BINDINGS ---
    if(showSignupLink) showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showSignupScreen(); });
    if(showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLoginScreen(); });
    if(loginBtn) loginBtn.addEventListener('click', handleLogin);
    if(signupBtn) signupBtn.addEventListener('click', handleSignup);
    if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Password Visibility Toggles
    if (showPasswordToggle && loginPassword) {
        showPasswordToggle.addEventListener('change', () => {
            loginPassword.type = showPasswordToggle.checked ? 'text' : 'password';
        });
    }
    if (showSignupPasswordToggle && signupPassword) {
        showSignupPasswordToggle.addEventListener('change', () => {
            signupPassword.type = showSignupPasswordToggle.checked ? 'text' : 'password';
        });
    }
    if (showNewPasswordToggle && newPassword) {
        showNewPasswordToggle.addEventListener('change', () => {
            newPassword.type = showNewPasswordToggle.checked ? 'text' : 'password';
        });
    }

    // --- NAVIGATION BINDINGS ---
    if(historyBtn) historyBtn.addEventListener('click', showSongHistoryPage);
    if(backToHomeBtn) backToHomeBtn.addEventListener('click', showHomeScreen);
    if(settingsBtn) settingsBtn.addEventListener('click', showSettingsScreen);
    if(backFromSettingsBtn) backFromSettingsBtn.addEventListener('click', showHomeScreen);

    // --- SETTINGS BINDINGS ---
    if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => saveUserSettings());
    if(changePasswordBtn) changePasswordBtn.addEventListener('click', handleChangePassword);

    // --- RECOMMENDATION & FEEDBACK BINDINGS ---
    if(skipBtn) skipBtn.addEventListener('click', onSkipTap);
    if(likeBtn) likeBtn.addEventListener('click', () => sendFeedback('like'));
    if(dislikeBtn) dislikeBtn.addEventListener('click', () => sendFeedback('dislike'));

    // Bind Mood Buttons
    if (moodGrid) {
        moodGrid.innerHTML = ''; // Clear existing
        MOODS.forEach(m => {
            const btn = document.createElement('div');
            btn.className = 'mood-btn';
            btn.dataset.mood = m.id;
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