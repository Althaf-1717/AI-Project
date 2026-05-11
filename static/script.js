let authToken  = localStorage.getItem('pas_token')  || '';
let currentUser= JSON.parse(localStorage.getItem('pas_user') || 'null');
async function initGoogleAuth() {
  try {
    const res  = await fetch('/api/config');
    const conf = await res.json();
    const clientId = conf.google_client_id;
    const loginWrapper  = document.getElementById('google-login-wrapper');
    const signupWrapper = document.getElementById('google-signup-wrapper');
    if (clientId) {
      const onload = `<div id="g_id_onload"
        data-client_id="${clientId}"
        data-callback="handleGoogleLogin"
        data-auto_prompt="false">
      </div>`;
      const btnLogin  = `<div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_black" data-text="signin_with" data-size="large" data-logo_alignment="left" data-width="320"></div>`;
      const btnSignup = `<div class="g_id_signin" data-type="standard" data-shape="rectangular" data-theme="filled_black" data-text="signup_with" data-size="large" data-logo_alignment="left" data-width="320"></div>`;
      loginWrapper.innerHTML  = onload + btnLogin;
      signupWrapper.innerHTML = btnSignup;
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleLogin });
        window.google.accounts.id.renderButton(loginWrapper.querySelector('.g_id_signin'),  { type:'standard', theme:'filled_black', size:'large', text:'signin_with', width:320 });
        window.google.accounts.id.renderButton(signupWrapper.querySelector('.g_id_signin'), { type:'standard', theme:'filled_black', size:'large', text:'signup_with', width:320 });
      }
    } else {
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
function showDashboard() {
  landingPage.style.display  = 'none';
  authModal.classList.add('hidden');
  appContainer.style.display = 'flex';
  if (currentUser) {
    sidebarName.textContent    = currentUser.name  || 'User';
    sidebarEmail.textContent   = currentUser.email || '';
    userAvatarIcon.textContent = (currentUser.name || 'U')[0].toUpperCase();
  }
  fetchChats();
}
function showLanding() {
  landingPage.style.display  = 'flex';
  appContainer.style.display = 'none';
  authModal.classList.add('hidden');
}
if (authToken && currentUser) {
  showDashboard();
} else {
  showLanding();
}
function openModal(panel) {
  authModal.classList.remove('hidden');
  if (panel === 'signup') {
    authLogin.classList.add('hidden');
    authSignup.classList.remove('hidden');
  } else {
    authSignup.classList.add('hidden');
    authLogin.classList.remove('hidden');
  }
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
authModal.addEventListener('click', (e) => { if (e.target === authModal) authModal.classList.add('hidden'); });
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
  document.getElementById('new-chat-btn').addEventListener('click', () => {
    if (window.innerWidth <= 768) toggleSidebar(false);
  });
}
function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}
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
logoutBtn.addEventListener('click', () => {
  clearAuth();
  chats = [];
  saveChats();
  chatBox.innerHTML = '';
  renderHistory();
  showLanding();
});
let currentAccent = localStorage.getItem('pas_accent') || 'violet';
let isDark        = localStorage.getItem('pas_dark') === 'true';
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
  document.querySelectorAll('#theme-toggle-check, #dash-theme-toggle-check').forEach(c => c.checked = dark);
}
document.querySelectorAll('.color-btn').forEach(btn => {
  if (btn.dataset.color === currentAccent) btn.classList.add('active');
  btn.addEventListener('click', () => applyColor(btn.dataset.color));
});
document.querySelectorAll('#theme-toggle-check, #dash-theme-toggle-check').forEach(chk => {
  chk.checked = isDark;
  chk.addEventListener('change', () => applyMode(chk.checked));
});
const landingThemeBtn     = document.getElementById('landing-theme-btn');
const landingThemePopover = document.getElementById('landing-theme-popover');
landingThemeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  landingThemePopover.classList.toggle('hidden');
});
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
const observer = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
}, { threshold: 0.15 });
document.querySelectorAll('.anim-on-scroll').forEach(el => observer.observe(el));
let chats = [];
let currentChatId = null;
let startTime = Date.now();

async function fetchChats() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/chats', { headers: { 'Authorization': `Bearer ${authToken}` } });
    if (res.ok) {
      const data = await res.json();
      chats = data;
      if (!chats.find(c => c.id === currentChatId)) {
        createNewChat();
      } else {
        renderHistory();
      }
    }
  } catch (err) { console.error('Failed to fetch chats', err); }
}

async function syncChat(chat) {
  if (!authToken) return;
  try {
    await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(chat)
    });
  } catch (err) { console.error('Failed to sync chat', err); }
}

async function renameChat(id, newTitle) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  chat.title = newTitle;
  renderHistory();
  if (authToken) {
    await fetch(`/api/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ title: newTitle })
    });
  }
}

async function deleteChat(id) {
  chats = chats.filter(c => c.id !== id);
  if (currentChatId === id) createNewChat();
  renderHistory();
  if (authToken) {
    await fetch(`/api/chats/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
  }
}

function shareChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  const text = chat.messages.map(m => `${m.role === 'ai' ? 'PAS GPT' : 'You'}: ${m.text}`).join('\n\n');
  navigator.clipboard.writeText(text).then(() => alert('Chat copied to clipboard!'));
}

function saveChats() {
  localStorage.setItem('pas_history', JSON.stringify(chats));
  const chat = chats.find(c => c.id === currentChatId);
  if (chat) syncChat(chat);
}

let globalHistoryDropdown = document.getElementById('global-history-dropdown');
if (!globalHistoryDropdown) {
  globalHistoryDropdown = document.createElement('div');
  globalHistoryDropdown.id = 'global-history-dropdown';
  globalHistoryDropdown.className = 'history-dropdown hidden';
  globalHistoryDropdown.innerHTML = `
    <div class="dropdown-item share-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share</div>
    <div class="dropdown-item group-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Start a group chat</div>
    <div class="dropdown-item rename-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Rename</div>
    <div class="dropdown-item pin-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> Pin chat</div>
    <div class="dropdown-item archive-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Archive</div>
    <div class="dropdown-item danger del-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</div>
  `;
  document.body.appendChild(globalHistoryDropdown);
}

function renderHistory() {
  historyList.innerHTML = '';
  chats.forEach((chat) => {
    const div = document.createElement('div');
    div.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'history-title';
    titleSpan.textContent = chat.title;
    titleSpan.onclick = () => switchChat(chat.id);
    titleSpan.style.flex = "1";
    titleSpan.style.overflow = "hidden";
    titleSpan.style.textOverflow = "ellipsis";
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'history-options';
    actionsDiv.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
    
    actionsDiv.onclick = (e) => {
      e.stopPropagation();
      const rect = actionsDiv.getBoundingClientRect();
      globalHistoryDropdown.style.position = 'fixed';
      globalHistoryDropdown.style.top = (rect.bottom + 5) + 'px';
      globalHistoryDropdown.style.left = (rect.right - 200) + 'px';
      
      // Update global dropdown handlers for THIS chat
      globalHistoryDropdown.querySelector('.rename-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); const newTitle = prompt('Enter new title:', chat.title); if (newTitle) renameChat(chat.id, newTitle); };
      globalHistoryDropdown.querySelector('.share-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); shareChat(chat.id); };
      globalHistoryDropdown.querySelector('.del-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); if(confirm('Delete this chat?')) deleteChat(chat.id); };
      globalHistoryDropdown.querySelector('.group-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); alert('Group chat feature coming soon!'); };
      globalHistoryDropdown.querySelector('.pin-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); alert('Pin chat feature coming soon!'); };
      globalHistoryDropdown.querySelector('.archive-btn').onclick = (e) => { e.stopPropagation(); globalHistoryDropdown.classList.add('hidden'); alert('Archive feature coming soon!'); };
      
      globalHistoryDropdown.classList.toggle('hidden');
    };
    
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.appendChild(titleSpan);
    div.appendChild(actionsDiv);
    
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
  if (role === 'user' && chat.messages.length === 1) {
    chat.title = text.slice(0, 30);
    renderHistory();
  }
  saveChats();
}
function appendWelcomeMessage() {
  chatBox.innerHTML = '';
  const name = currentUser ? currentUser.name.split(' ')[0] : 'there';
  appendMessage('ai', `Hello ${name}! I'm PAS GPT, your enterprise cognitive assistant. How can I help you today?`);
}
function appendMessage(role, text) {
  const div = document.createElement('div');
  div.className = role === 'ai' ? 'message ai-message' : 'message user-message';
  if (role === 'ai') {
    div.innerHTML = `
      <div class="ai-msg-header">
        <strong>PAS GPT</strong>
        <div class="ai-msg-actions">
          <button class="msg-action-btn copy-ai-btn" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
        </div>
      </div>
      <div class="msg-content">${marked.parse(text)}</div>
    `;
    div.querySelector('.copy-ai-btn').onclick = () => { navigator.clipboard.writeText(text); alert('Copied!'); };
  } else {
    div.innerHTML = `<div class="user-text">${text.replace(/</g,'&lt;')}</div>`;
    const actions = document.createElement('div');
    actions.className = 'user-msg-actions';
    actions.innerHTML = `
      <button class="msg-action-btn copy-msg-btn" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button class="msg-action-btn edit-msg-btn" title="Edit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    `;
    actions.querySelector('.copy-msg-btn').onclick = () => { navigator.clipboard.writeText(text); alert('Copied!'); };
    actions.querySelector('.edit-msg-btn').onclick = () => { 
      const newText = prompt('Edit your message:', text); 
      if(newText && newText !== text) {
        div.querySelector('.user-text').textContent = newText;
        const chat = chats.find(c => c.id === currentChatId);
        if(chat) {
          const msgObj = chat.messages.find(m => m.text === text && m.role === 'user');
          if (msgObj) { msgObj.text = newText; saveChats(); }
        }
      }
    };
    div.appendChild(actions);
  }
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}
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
const modelSelector = document.getElementById('model-selector');
const modelDropdown = document.getElementById('model-dropdown');
const currentModelIcon = document.getElementById('current-model-icon');
const modelOptions = document.querySelectorAll('.model-option');
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
    modelOptions.forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    currentModelIcon.innerHTML = opt.querySelector('svg').outerHTML;
    modelDropdown.classList.add('hidden');
  });
});
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
  fileBadgeContainer.classList.add('hidden');
  showTyping();
  const chat = chats.find(c => c.id === currentChatId);
  const historyToSend = chat.messages.slice(0, -1); 
  const formData = new FormData();
  formData.append('message', text || 'Please analyze this file.');
  formData.append('provider', selectedProvider);
  formData.append('history', JSON.stringify(historyToSend));
  if (selectedFile) formData.append('file', selectedFile);
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
newChatBtn.addEventListener('click', async () => {
  createNewChat();
  if (authToken) {
    await fetch('/api/reset', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
  }
});
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
userInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});
document.getElementById('nav-chat').addEventListener('click', () => {
  document.getElementById('view-chat').classList.add('active');
  document.getElementById('view-tools').classList.remove('active');
  document.getElementById('view-tools').classList.add('hidden');
  document.getElementById('view-chat').classList.remove('hidden');
  document.getElementById('nav-chat').classList.add('active');
  document.getElementById('nav-tools').classList.remove('active');
});
document.querySelector('.user-card').addEventListener('click', (e) => {
  if (e.target.closest('#logout-btn')) return;
  document.getElementById('view-tools').classList.add('active');
  document.getElementById('view-chat').classList.remove('active');
  document.getElementById('view-chat').classList.add('hidden');
  document.getElementById('view-tools').classList.remove('hidden');
  document.getElementById('nav-chat').classList.remove('active');
});
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (window.innerWidth <= 768) {
      sidebar.classList.add('open');
      document.getElementById('sidebar-overlay').classList.add('active');
    } else {
      sidebar.classList.toggle('collapsed');
    }
  });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.history-options')) {
    document.querySelectorAll('.history-dropdown').forEach(d => d.classList.add('hidden'));
  }
});
document.getElementById('close-camera-btn').addEventListener('click', () => {
  const feed = document.getElementById('camera-feed');
  if (feed.srcObject) feed.srcObject.getTracks().forEach(t => t.stop());
  document.getElementById('camera-overlay').classList.add('hidden');
});
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
document.getElementById('export-logs').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(chats, null, 2)], {type:'application/json'});
  const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'pas_gpt_logs.json' });
  a.click();
});
document.getElementById('reset-session').addEventListener('click', async () => {
  if (authToken) {
    await fetch('/api/reset', { method:'POST', headers:{'Authorization':`Bearer ${authToken}`} });
    alert('Cognitive cache cleared.');
  }
});
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang  = 'en-US';
  recognition.onresult = (e) => { userInput.value = e.results[0][0].transcript; sendMessage(); };
  micBtn.addEventListener('click', () => recognition.start());
} else {
  micBtn.style.display = 'none';
}