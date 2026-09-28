/* =====================================================================
   AI Chat Assistant — app.js
   Connects to n8n webhook: https://saraa1528.app.n8n.cloud/webhook/chat
   ===================================================================== */

const WEBHOOK_URL = 'https://saraa1528.app.n8n.cloud/webhook/chat';

// ─── State ────────────────────────────────────────────────────────────────────
let conversations = JSON.parse(localStorage.getItem('ai_conversations') || '[]');
let activeConvId  = null;
let isLoading     = false;
let isDark        = localStorage.getItem('ai_theme') !== 'light';

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const menuToggle      = document.getElementById('menuToggle');
const newChatBtn      = document.getElementById('newChatBtn');
const chatHistory     = document.getElementById('chatHistory');
const searchInput     = document.getElementById('searchInput');
const chatContainer   = document.getElementById('chatContainer');
const welcomeScreen   = document.getElementById('welcomeScreen');
const messagesArea    = document.getElementById('messagesArea');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const charCount       = document.getElementById('charCount');
const clearChatBtn    = document.getElementById('clearChatBtn');
const themeToggle     = document.getElementById('themeToggle');
const sunIcon         = document.getElementById('sunIcon');
const moonIcon        = document.getElementById('moonIcon');
const toast           = document.getElementById('toast');

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  applyTheme(isDark);
  renderHistory();

  // Auto-select last active conversation
  const lastId = localStorage.getItem('ai_active_conv');
  if (lastId && conversations.find(c => c.id === lastId)) {
    loadConversation(lastId);
  }
})();

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  sunIcon.style.display  = dark ? 'block' : 'none';
  moonIcon.style.display = dark ? 'none' : 'block';
  localStorage.setItem('ai_theme', dark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => applyTheme(!isDark));

// ─── Sidebar Toggle ───────────────────────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}
menuToggle.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

// ─── Conversation Management ──────────────────────────────────────────────────
function createConversation(firstMessage) {
  const conv = {
    id:       'conv_' + Date.now(),
    title:    firstMessage.slice(0, 50) || 'New Chat',
    messages: [],
    createdAt: Date.now(),
  };
  conversations.unshift(conv);
  saveConversations();
  return conv;
}

function saveConversations() {
  localStorage.setItem('ai_conversations', JSON.stringify(conversations));
}

function loadConversation(id) {
  activeConvId = id;
  localStorage.setItem('ai_active_conv', id);

  const conv = conversations.find(c => c.id === id);
  if (!conv) return;

  showChat();
  renderMessages(conv.messages);
  renderHistory();
}

function deleteConversation(id, e) {
  e.stopPropagation();
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();

  if (activeConvId === id) {
    activeConvId = null;
    localStorage.removeItem('ai_active_conv');
    showWelcome();
  }
  renderHistory();
  showToast('Conversation deleted');
}

// ─── Render History Sidebar ───────────────────────────────────────────────────
function renderHistory(filter = '') {
  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    chatHistory.innerHTML = `<div class="empty-history">
      ${filter ? 'No conversations match your search.' : 'No conversations yet.<br>Start a new chat!'}
    </div>`;
    return;
  }

  chatHistory.innerHTML = filtered.map(conv => `
    <div class="history-item ${conv.id === activeConvId ? 'active' : ''}"
         onclick="loadConversation('${conv.id}')" id="hi_${conv.id}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="history-item-title">${escapeHtml(conv.title)}</span>
      <button class="history-item-delete"
              onclick="deleteConversation('${conv.id}', event)"
              title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  `).join('');
}

searchInput.addEventListener('input', () => renderHistory(searchInput.value));

// ─── UI State ─────────────────────────────────────────────────────────────────
function showWelcome() {
  welcomeScreen.style.display = 'flex';
  messagesArea.style.display  = 'none';
}

function showChat() {
  welcomeScreen.style.display = 'none';
  messagesArea.style.display  = 'flex';
}

// ─── New Chat ─────────────────────────────────────────────────────────────────
newChatBtn.addEventListener('click', startNewChat);
clearChatBtn.addEventListener('click', () => {
  if (!activeConvId) return;
  const conv = conversations.find(c => c.id === activeConvId);
  if (!conv || conv.messages.length === 0) return;
  if (confirm('Clear this conversation?')) {
    conv.messages = [];
    saveConversations();
    showWelcome();
    showToast('Chat cleared');
  }
});

function startNewChat() {
  activeConvId = null;
  localStorage.removeItem('ai_active_conv');
  showWelcome();
  renderHistory();
  closeSidebar();
}

// ─── Export Chat ─────────────────────────────────────────────────────────────
const exportChatBtn = document.getElementById('exportChatBtn');
const micBtn        = document.getElementById('micBtn');

if (exportChatBtn) {
  exportChatBtn.addEventListener('click', () => {
    if (!activeConvId) {
      showToast('No active chat to export');
      return;
    }
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv || conv.messages.length === 0) {
      showToast('Chat is empty');
      return;
    }

    let text = `=== Conversation: ${conv.title} ===\nDate: ${new Date(conv.createdAt).toLocaleString()}\n\n`;
    conv.messages.forEach(m => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      text += `[${time}] ${m.role === 'user' ? 'User' : 'AI Assistant'}:\n${m.content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported conversation as text file');
  });
}

// ─── Speech Recognition (Voice Input) ────────────────────────────────────────
let recognition = null;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    micBtn.classList.add('listening');
    showToast('Listening... Speak into your microphone');
  };

  recognition.onresult = (e) => {
    let transcript = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      transcript += e.results[i][0].transcript;
    }
    userInput.value = transcript;
    userInput.dispatchEvent(new Event('input'));
  };

  recognition.onerror = (e) => {
    micBtn.classList.remove('listening');
    showToast('Speech recognition error: ' + e.error);
  };

  recognition.onend = () => {
    micBtn.classList.remove('listening');
  };

  micBtn.addEventListener('click', () => {
    if (micBtn.classList.contains('listening')) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });
} else if (micBtn) {
  micBtn.addEventListener('click', () => {
    showToast('Speech recognition is not supported in this browser.');
  });
}

// ─── Text to Speech ──────────────────────────────────────────────────────────
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Text-to-speech not supported');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
  showToast('Reading response aloud...');
}

// ─── Render Messages ──────────────────────────────────────────────────────────
function renderMessages(messages) {
  messagesArea.innerHTML = '';

  messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.content, msg.timestamp, false);
  });

  scrollToBottom();
}

function appendMessageToDOM(role, content, timestamp, animate = true) {
  const group = document.createElement('div');
  group.className = `message-group${animate ? '' : ''}`;

  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formattedContent = role === 'ai' ? formatAIText(content) : escapeHtml(content);

  if (role === 'user') {
    group.innerHTML = `
      <div class="message-row user">
        <div class="bubble user">${formattedContent}</div>
      </div>
      <div class="message-meta" style="justify-content:flex-end">
        <span>${time}</span>
        <button class="copy-btn" onclick="copyText(this, ${JSON.stringify(content)})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Copy
        </button>
      </div>`;
  } else {
    group.innerHTML = `
      <div class="message-row ai">
        <div class="ai-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="bubble ai${content.startsWith('⚠') ? ' error' : ''}">${formattedContent}</div>
      </div>
      <div class="message-meta">
        <span>${time}</span>
        <button class="copy-btn" onclick="copyText(this, ${JSON.stringify(content)})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
          </svg>
          Copy
        </button>
        <button class="copy-btn" onclick="speakText(${JSON.stringify(content)})">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Listen
        </button>
      </div>`;
  }

  messagesArea.appendChild(group);
  if (animate) {
    group.style.animation = 'msg-in 0.3s ease';
    scrollToBottom();
  }
}

// ─── Format AI Text ───────────────────────────────────────────────────────────
function formatAIText(text) {
  // Escape HTML first
  let html = escapeHtml(text);

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<strong>$1</strong>');
  html = html.replace(/^## (.+)$/gm,  '<strong>$1</strong>');
  html = html.replace(/^# (.+)$/gm,   '<strong>$1</strong>');

  // Unordered lists
  html = html.replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks → paragraphs
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<li')) return p;
    return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
  }).join('');

  return html;
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function showTyping() {
  removeTyping();
  const el = document.createElement('div');
  el.className = 'typing-indicator';
  el.id = 'typingIndicator';
  el.innerHTML = `
    <div class="ai-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  messagesArea.appendChild(el);
  scrollToBottom();
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  // Get or create conversation
  let conv;
  if (!activeConvId) {
    conv = createConversation(text);
    activeConvId = conv.id;
    localStorage.setItem('ai_active_conv', activeConvId);
    showChat();
  } else {
    conv = conversations.find(c => c.id === activeConvId);
  }

  // Add user message
  const userMsg = { role: 'user', content: text, timestamp: Date.now() };
  conv.messages.push(userMsg);

  // Update title from first message
  if (conv.messages.filter(m => m.role === 'user').length === 1) {
    conv.title = text.slice(0, 50);
  }

  saveConversations();
  renderHistory();

  // Render user message
  appendMessageToDOM('user', text, userMsg.timestamp);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '';
  sendBtn.disabled = true;

  // Show typing
  isLoading = true;
  showTyping();

  try {
    const response = await callWebhook(text, conv.messages);
    removeTyping();

    const aiMsg = { role: 'ai', content: response, timestamp: Date.now() };
    conv.messages.push(aiMsg);
    saveConversations();

    appendMessageToDOM('ai', response, aiMsg.timestamp);
  } catch (err) {
    removeTyping();
    const errText = '⚠ ' + (err.message || 'Something went wrong. Please try again.');
    appendMessageToDOM('ai', errText, Date.now());
  } finally {
    isLoading = false;
    userInput.focus();
  }
}

// ─── Call n8n Webhook ─────────────────────────────────────────────────────────
async function callWebhook(message, history) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      signal:  controller.signal,
      body: JSON.stringify({
        message,
        chatInput: message,
        sessionId: activeConvId,
        history: history.slice(-10).map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
    }

    const rawText = await res.text();

    // Try parsing as JSON first; if it's plain text, return rawText directly
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return rawText;
    }

    // Handle various n8n JSON response structures
    if (typeof data === 'string') return data;
    if (data.output)   return data.output;
    if (data.text)     return data.text;
    if (data.message)  return data.message;
    if (data.response) return data.response;
    if (Array.isArray(data) && data[0]) {
      const first = data[0];
      if (typeof first === 'string') return first;
      if (first.output)   return first.output;
      if (first.text)     return first.text;
      if (first.message)  return first.message;
      if (first.response) return first.response;
    }

    return typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Input Events ─────────────────────────────────────────────────────────────
userInput.addEventListener('input', () => {
  // Auto-resize
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';

  const len = userInput.value.length;
  sendBtn.disabled = len === 0 || isLoading;
  charCount.textContent = len > 3500 ? `${len}/4000` : '';
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ─── Suggestion Cards ─────────────────────────────────────────────────────────
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    userInput.value = prompt;
    userInput.dispatchEvent(new Event('input'));
    sendMessage();
  });
});

// ─── Scroll ───────────────────────────────────────────────────────────────────
function scrollToBottom() {
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 50);
}

// ─── Copy Text ────────────────────────────────────────────────────────────────
function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copied!';
    showToast('Copied to clipboard');
    setTimeout(() => {
      btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="2"/>
      </svg> Copy`;
    }, 2000);
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Expose globals needed by inline handlers ─────────────────────────────────
window.loadConversation    = loadConversation;
window.deleteConversation  = deleteConversation;
window.copyText            = copyText;
window.speakText           = speakText;

