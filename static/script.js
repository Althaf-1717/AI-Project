/* ══════════════════════════════════════════
   PAS GPT — script.js  v3.0
══════════════════════════════════════════ */

// ─── Auth helpers ────────────────────────────────────
let authToken  = localStorage.getItem('pas_token')  || '';
let currentUser= JSON.parse(localStorage.getItem('pas_user') || 'null');

// ─── Initialize Google Sign-In dynamically ────────────
async function initGoogleAuth() {
  try {
    const res  = await fetch('/api/config');
    const conf = await res.json();
    const clientId = conf.google_client_id;

    const loginWrapper  = document.getElementById('google-login-wrapper');
    const signupWrapper = document.getElementById('google-signup-wrapper');

    if (clientId) {
      // Inject Google Identity Services markup
      const onload = `<div id="g_id_onload"
        data-client_id="${clientId}"
        data-callback="handleGoogleLogin"
        data-auto_prompt="false">
      </div>`;
      const btnLogin  = `<div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_black" data-text="signin_with" data-size="large" data-logo_alignment="left" data-width="320"></div>`;
      const btnSignup = `<div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_black" data-text="signup_with" data-size="large" data-logo_alignment="left" data-width="320"></div>`;
      loginWrapper.innerHTML  = onload + btnLogin;
      signupWrapper.innerHTML = btnSignup;
      // Tell Google's library to scan for new elements
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleLogin });
        window.google.accounts.id.renderButton(loginWrapper.querySelector('.g_id_signin'),  { type:'standard', theme:'filled_black', size:'large', text:'signin_with', width:320 });
        window.google.accounts.id.renderButton(signupWrapper.querySelector('.g_id_signin'), { type:'standard', theme:'filled_black', size:'large', text:'signup_with', width:320 });
      }
    } else {
      // No client ID configured — show a helpful notice
      const notice = `<div class="google-setup-notice">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Google Sign-In not configured.
        <a href="https://console.cloud.google.com/" target="_blank">Set it up →</a>
      </div>`;
      loginWrapper.innerHTML  = notice;
      signupWrapper.innerHTML = notice;
    }
  } catch(e) {
    console.log('Google auth config fetch failed:', e);
  }
}

initGoogleAuth();

function saveAuth(token, user) {
  authToken    = token;
  currentUser  = user;
  localStorage.setItem('pas_token',  token);
  localStorage.setItem('pas_user',   JSON.stringify(user));
}

function clearAuth() {
  authToken   = '';
  currentUser = null;
  localStorage.removeItem('pas_token');
  localStorage.removeItem('pas_user');
}

// ─── DOM references ──────────────────────────────────
const landingPage    = document.getElementById('landing-page');
const appContainer   = document.getElementById('app-container');
const authModal      = document.getElementById('auth-modal');
const authLogin      = document.getElementById('auth-login');
const authSignup     = document.getElementById('auth-signup');
const loginForm      = document.getElementById('login-form');
const signupForm     = document.getElementById('signup-form');
const loginError     = document.getElementById('login-error');
const signupError    = document.getElementById('signup-error');
const chatBox        = document.getElementById('chat-box');
const userInput      = document.getElementById('user-input');
const sendBtn        = document.getElementById('send-btn');
const micBtn         = document.getElementById('mic-btn');
const newChatBtn     = document.getElementById('new-chat-btn');
const historyList    = document.getElementById('history-list');
const sidebarName    = document.getElementById('sidebar-user-name');
const sidebarEmail   = document.getElementById('sidebar-user-email');
const userAvatarIcon = document.getElementById('user-avatar-icon');
const logoutBtn      = document.getElementById('logout-btn');

// ─── Page routing ─────────────────────────────────────
function showDashboard() {
  landingPage.style.display  = 'none';
  authModal.classList.add('hidden');
  appContainer.style.display = 'flex';
  // Populate user info
  if (currentUser) {
    sidebarName.textContent    = currentUser.name  || 'User';
    sidebarEmail.textContent   = currentUser.email || '';
    userAvatarIcon.textContent = (currentUser.name || 'U')[0].toUpperCase();
  }
  appendWelcomeMessage();
}

function showLanding() {
  landingPage.style.display  = 'flex';
  appContainer.style.display = 'none';
  authModal.classList.add('hidden');
}

// ─── Check if already logged in ───────────────────────
if (authToken && currentUser) {
  showDashboard();
} else {
  showLanding();
}

// ─── Open/close auth modal ────────────────────────────
function openModal(panel) {
  authModal.classList.remove('hidden');
  if (panel === 'signup') {
    authLogin.classList.add('hidden');
    authSignup.classList.remove('hidden');
  } else {
    authSignup.classList.add('hidden');
    authLogin.classList.remove('hidden');
  }
  // Clear errors
  loginError.classList.add('hidden');
  signupError.classList.add('hidden');
}

document.getElementById('open-login-btn').addEventListener('click',  () => openModal('login'));
document.getElementById('open-signup-btn').addEventListener('click',  () => openModal('signup'));
document.getElementById('hero-signup-btn').addEventListener('click',  () => openModal('signup'));
document.getElementById('hero-login-link').addEventListener('click',  () => openModal('login'));
document.getElementById('close-auth-btn').addEventListener('click',   () => authModal.classList.add('hidden'));
document.getElementById('switch-to-signup').addEventListener('click', (e) => { e.preventDefault(); openModal('signup'); });
document.getElementById('switch-to-login').addEventListener('click',  (e) => { e.preventDefault(); openModal('login'); });

// Close modal when clicking overlay backdrop
authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.add('hidden'); });

// ─── Mobile Sidebar Toggle ─────────────────────────────
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebar = document.querySelector('.sidebar');

function toggleSidebar(show) {
  if (show) {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
  } else {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }
}

if (mobileMenuBtn && closeSidebarBtn && sidebarOverlay) {
  mobileMenuBtn.addEventListener('click', () => toggleSidebar(true));
  closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
  sidebarOverlay.addEventListener('click', () => toggleSidebar(false));
  
  // Close sidebar on new chat to save space
  document.getElementById('new-chat-btn').addEventListener('click', () => {
    if (window.innerWidth <= 768) toggleSidebar(false);
  });
}

// ─── Show/hide auth error ─────────────────────────────
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

// ─── Login form ───────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = loginForm.querySelector('button[type=submit]');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  loginError.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span>Signing in...</span>';
  try {
    const res  = await fetch('/api/login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed.');
    saveAuth(data.token, { name: data.name, email: data.email });
    showDashboard();
  } catch(err) {
    showError(loginError, err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Sign In</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }
});

// ─── Signup form ──────────────────────────────────────
document.getElementById('signup-password').addEventListener('input', function () {
  const val = this.value;
  const fill = document.querySelector('.pw-fill');
  const strength = Math.min((val.length / 12) * 100, 100);
  fill.style.width = strength + '%';
  fill.style.background = val.length < 4 ? '#ef4444' : val.length < 8 ? '#f59e0b' : '#10b981';
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = signupForm.querySelector('button[type=submit]');
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-password').value;
  signupError.classList.add('hidden');

  if (pass.length < 6) { showError(signupError, 'Password must be at least 6 characters.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span>Creating account...</span>';
  try {
    const res  = await fetch('/api/signup', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Signup failed.');
    saveAuth(data.token, { name: data.name, email: data.email });
    showDashboard();
  } catch(err) {
    showError(signupError, err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }
});

// ─── Google OAuth callback ────────────────────────────
window.handleGoogleLogin = async function(credentialResponse) {
  try {
    const res  = await fetch('/api/google-login', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token: credentialResponse.credential })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Google login failed.');
    saveAuth(data.token, { name: data.name, email: data.email });
    showDashboard();
  } catch(err) {
    showError(loginError, err.message);
    showError(signupError, err.message);
  }
};

// ─── Logout ───────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
  clearAuth();
  chats = [];
  saveChats();
  chatBox.innerHTML = '';
  renderHistory();
  showLanding();
});

// ─── Theme system ─────────────────────────────────────
let currentAccent = localStorage.getItem('pas_accent') || 'violet';
let isDark        = localStorage.getItem('pas_dark') !== 'false';
document.body.dataset.accent = currentAccent;
document.body.className      = isDark ? 'dark-theme' : 'light-theme';

function applyColor(color) {
  currentAccent = color;
  document.body.dataset.accent = color;
  localStorage.setItem('pas_accent', color);
  document.querySelectorAll('.color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === color));
}

function applyMode(dark) {
  isDark = dark;
  document.body.className = dark ? 'dark-theme' : 'light-theme';
  localStorage.setItem('pas_dark', String(dark));
  // Sync ALL checkboxes
  document.querySelectorAll('#theme-toggle-check, #dash-theme-toggle-check').forEach(c => c.checked = dark);
}

// Sync all color buttons
document.querySelectorAll('.color-btn').forEach(btn => {
  if (btn.dataset.color === currentAccent) btn.classList.add('active');
  btn.addEventListener('click', () => applyColor(btn.dataset.color));
});

// Sync all dark/light toggles
document.querySelectorAll('#theme-toggle-check, #dash-theme-toggle-check').forEach(chk => {
  chk.checked = isDark;
  chk.addEventListener('change', () => applyMode(chk.checked));
});

// Landing theme popover
const landingThemeBtn     = document.getElementById('landing-theme-btn');
const landingThemePopover = document.getElementById('landing-theme-popover');
landingThemeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  landingThemePopover.classList.toggle('hidden');
});

// Dashboard theme popover
const dashThemeBtn     = document.getElementById('dash-theme-btn');
const dashThemePopover = document.getElementById('dash-theme-popover');
dashThemeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  dashThemePopover.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  landingThemePopover.classList.add('hidden');
  dashThemePopover.classList.add('hidden');
});

// ─── Scroll animation (landing) ───────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.anim-on-scroll').forEach(el => observer.observe(el));

// ─── Chat state ───────────────────────────────────────
let rawChats = JSON.parse(localStorage.getItem('pas_history') || '[]');
let chats = rawChats.filter(c => c.id && Array.isArray(c.messages));
let currentChatId = null;
let startTime = Date.now();

function saveChats() {
  localStorage.setItem('pas_history', JSON.stringify(chats));
}

function renderHistory() {
  historyList.innerHTML = '';
  chats.forEach((chat) => {
    const div = document.createElement('div');
    div.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
    div.textContent = chat.title;
    div.onclick = () => switchChat(chat.id);
    historyList.appendChild(div);
  });
}

function switchChat(id) {
  currentChatId = id;
  renderHistory();
  chatBox.innerHTML = '';
  
  if (window.innerWidth <= 768 && typeof toggleSidebar === 'function') {
    toggleSidebar(false);
  }
  
  const chat = chats.find(c => c.id === currentChatId);
  if (chat && chat.messages.length > 0) {
    chat.messages.forEach(msg => {
      appendMessage(msg.role, msg.text);
    });
  } else {
    appendWelcomeMessage();
  }
}

function createNewChat() {
  currentChatId = 'chat_' + Date.now();
  chats.unshift({ id: currentChatId, title: 'New Chat', messages: [], time: Date.now() });
  saveChats();
  renderHistory();
  chatBox.innerHTML = '';
  appendWelcomeMessage();
}

function saveMessage(role, text) {
  let chat = chats.find(c => c.id === currentChatId);
  if (!chat) {
    createNewChat();
    chat = chats.find(c => c.id === currentChatId);
  }
  chat.messages.push({ role, text });
  
  // Auto-title if it's the first user message
  if (role === 'user' && chat.messages.length === 1) {
    chat.title = text.slice(0, 30);
    renderHistory();
  }
  saveChats();
}

// Initialize chat session on load
if (chats.length > 0) {
  switchChat(chats[0].id);
} else {
  createNewChat();
}

// ─── Welcome message ─────────────────────────────────
function appendWelcomeMessage() {
  chatBox.innerHTML = '';
  const name = currentUser ? currentUser.name.split(' ')[0] : 'there';
  appendMessage('ai', `Hello ${name}! I'm PAS GPT, your enterprise cognitive assistant. How can I help you today?`);
}

// ─── Append message ───────────────────────────────────
function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = role === 'ai' ? 'message ai-message' : 'message user-message';

  if (role === 'ai') {
    div.innerHTML = `<strong>PAS GPT</strong><div class="msg-content">${marked.parse(text)}</div>`;
  } else {
    div.innerHTML = `<strong>You</strong><p>${text.replace(/</g,'&lt;')}</p>`;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

// ─── Typing indicator ─────────────────────────────────
function showTyping() {
  const div = document.createElement('div');
  div.className = 'message ai-message';
  div.id = 'typing-indicator';
  div.innerHTML = `<strong>PAS GPT</strong><div class="typing-dots"><span></span><span></span><span></span></div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

let selectedProvider = 'gemini';

// ─── Model Selector ───────────────────────────────────
const modelSelector = document.getElementById('model-selector');
const modelDropdown = document.getElementById('model-dropdown');
const currentModelIcon = document.getElementById('current-model-icon');
const modelOptions = document.querySelectorAll('.model-option');

// ─── File Upload Elements ─────────────────────────────
const fileUpload = document.getElementById('file-upload');
const attachBtn = document.getElementById('attach-btn');
const fileBadgeContainer = document.getElementById('file-badge-container');
const fileBadgeName = document.getElementById('file-badge-name');
const fileRemoveBtn = document.getElementById('file-remove-btn');

attachBtn.addEventListener('click', () => {
  fileUpload.click();
});

fileUpload.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    fileBadgeName.textContent = e.target.files[0].name;
    fileBadgeContainer.classList.remove('hidden');
    // Force Gemini if a file is uploaded
    selectedProvider = 'gemini';
    modelOptions.forEach(o => o.classList.remove('active'));
    document.querySelector('.model-option[data-provider="gemini"]').classList.add('active');
    currentModelIcon.innerHTML = document.querySelector('.model-option[data-provider="gemini"] svg').outerHTML;
  }
});

fileRemoveBtn.addEventListener('click', () => {
  fileUpload.value = '';
  fileBadgeContainer.classList.add('hidden');
});

modelSelector.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = modelSelector.getBoundingClientRect();
  console.log('Model selector clicked at:', rect.top, rect.left);
  modelDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!modelSelector.contains(e.target)) {
    modelDropdown.classList.add('hidden');
  }
});

modelOptions.forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedProvider = opt.dataset.provider;
    console.log('Provider changed to:', selectedProvider);
    
    // Update active class
    modelOptions.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    
    // Update icon
    currentModelIcon.innerHTML = opt.querySelector('svg').outerHTML;
    
    modelDropdown.classList.add('hidden');
  });
});

// ─── Send message ─────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  const selectedFile = fileUpload.files[0];
  
  if ((!text && !selectedFile) || !authToken) return;

  if (!currentChatId) createNewChat();

  const displayMsg = text || 'Sent a file for analysis.';
  appendMessage('user', displayMsg);
  saveMessage('user', displayMsg);
  userInput.value = '';
  userInput.style.height = 'auto';
  
  // Hide file badge immediately
  fileBadgeContainer.classList.add('hidden');

  showTyping();

  const chat = chats.find(c => c.id === currentChatId);
  const historyToSend = chat.messages.slice(0, -1); // send all messages EXCEPT the one we just appended

  const formData = new FormData();
  formData.append('message', text || 'Please analyze this file.');
  formData.append('provider', selectedProvider);
  formData.append('history', JSON.stringify(historyToSend));
  if (selectedFile) formData.append('file', selectedFile);

  // Clear file input early
  fileUpload.value = '';

  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    const data = await res.json();
    removeTyping();

    if (res.status === 401) {
      clearAuth();
      showLanding();
      return;
    }

    if (data.action === 'open_camera') {
      document.getElementById('camera-overlay').classList.remove('hidden');
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { document.getElementById('camera-feed').srcObject = stream; })
        .catch(() => {});
    }
    appendMessage('ai', data.response);
    saveMessage('ai', data.response);
  } catch(err) {
    removeTyping();
    appendMessage('ai', 'A network error occurred. Please check your connection.');
  }
}

// ─── New chat ─────────────────────────────────────────
newChatBtn.addEventListener('click', async () => {
  createNewChat();
  if (authToken) {
    await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  }
});

// ─── Input listeners ─────────────────────────────────
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

// ─── Nav tab switching ────────────────────────────────
document.getElementById('nav-chat').addEventListener('click', () => {
  document.getElementById('view-chat').classList.add('active');
  document.getElementById('view-tools').classList.remove('active');
  document.getElementById('view-tools').classList.add('hidden');
  document.getElementById('view-chat').classList.remove('hidden');
  document.getElementById('nav-chat').classList.add('active');
  document.getElementById('nav-tools').classList.remove('active');
});

document.getElementById('nav-tools').addEventListener('click', () => {
  document.getElementById('view-tools').classList.add('active');
  document.getElementById('view-chat').classList.remove('active');
  document.getElementById('view-chat').classList.add('hidden');
  document.getElementById('view-tools').classList.remove('hidden');
  document.getElementById('nav-tools').classList.add('active');
  document.getElementById('nav-chat').classList.remove('active');
});

// ─── Camera close ─────────────────────────────────────
document.getElementById('close-camera-btn').addEventListener('click', () => {
  const feed = document.getElementById('camera-feed');
  if (feed.srcObject) feed.srcObject.getTracks().forEach(t => t.stop());
  document.getElementById('camera-overlay').classList.add('hidden');
});

// ─── Uptime counter ───────────────────────────────────
setInterval(() => {
  const el = document.getElementById('uptime-display');
  if (el) {
    const s = Math.floor((Date.now() - startTime) / 1000);
    el.textContent = [
      String(Math.floor(s/3600)).padStart(2,'0'),
      String(Math.floor((s%3600)/60)).padStart(2,'0'),
      String(s%60).padStart(2,'0')
    ].join(':');
  }
}, 1000);

// ─── Export logs ─────────────────────────────────────
document.getElementById('export-logs').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(chats, null, 2)], {type:'application/json'});
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'pas_gpt_logs.json' });
  a.click();
});

// ─── Reset session (tools panel) ─────────────────────
document.getElementById('reset-session').addEventListener('click', async () => {
  if (authToken) {
    await fetch('/api/reset', { method:'POST', headers:{'Authorization':`Bearer ${authToken}`} });
    alert('Cognitive cache cleared.');
  }
});

// ─── Voice recognition ────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang  = 'en-US';
  recognition.onresult = (e) => { userInput.value = e.results[0][0].transcript; sendMessage(); };
  micBtn.addEventListener('click', () => recognition.start());
} else {
  micBtn.style.display = 'none';
}
