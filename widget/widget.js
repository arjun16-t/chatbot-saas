(function () {
  'use strict';

  // ── Step 1: Bootstrap ──────────────────────────────────────────
  // Must read currentScript synchronously, before any await/async work.
  const currentScript = document.currentScript;

  const API_BASE = currentScript ? new URL(currentScript.src).origin : '';
  const CONFIG_URL = API_BASE + '/api/widget/config/';
  const CHAT_URL = API_BASE + '/api/chat/';

  function getApiKey() {
    if (!currentScript) return null;
    const key = currentScript.getAttribute('data-api-key');
    if (!key || !key.trim()) return null;
    return key.trim();
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[AthenaChat] Missing data-api-key attribute. Widget will not load.');
    return;
  }

  // ── Step 2: Shadow DOM host ────────────────────────────────────
  function createWidgetHost() {
    const host = document.createElement('div');
    host.id = 'athenachat-widget-host';
    host.style.cssText = 'position: fixed; z-index: 2147483647; bottom: 20px; right: 20px;';
    document.body.appendChild(host);
    return { host: host, shadowRoot: host.attachShadow({ mode: 'open' }) };
  }

  const { host, shadowRoot } = createWidgetHost();

  const WIDGET_STYLES = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }

    .ac-bubble {
      width: 60px; height: 60px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }
    .ac-bubble:hover { transform: scale(1.05); }
    .ac-bubble svg { width: 28px; height: 28px; }

    .ac-window {
      display: none;
      flex-direction: column;
      width: 360px; height: 520px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      position: absolute;
      bottom: 76px;
      margin-bottom: 8px;
    }
    .ac-window.ac-open { display: flex; }

    .ac-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      color: #fff;
    }
    .ac-header img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .ac-header-name { font-weight: 600; font-size: 14px; }

    .ac-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .ac-msg { max-width: 80%; padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.4; }
    .ac-msg-bot { align-self: flex-start; border-bottom-left-radius: 4px; }
    .ac-msg-user { align-self: flex-end; border-bottom-right-radius: 4px; }

    .ac-input-row {
      display: flex; gap: 8px; padding: 12px;
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    .ac-input {
      flex: 1; border: 1px solid rgba(0,0,0,0.15); border-radius: 20px;
      padding: 9px 14px; font-size: 13.5px; outline: none;
    }
    .ac-send {
      border: none; border-radius: 50%; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      flex-shrink: 0;
    }
    .ac-send svg { width: 16px; height: 16px; }
    .ac-send:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_STYLES;
  shadowRoot.appendChild(styleEl);

  // ── Step 3: Config fetch ───────────────────────────────────────
  const DEFAULT_CONFIG = {
    theme_color: {
      primary_color: '#C8860A',
      secondary_color: '#F5C842',
      background_color: '#FFFDF5',
      text_color: '#111111',
      bot_bubble_color: '#FFFFFF',
      user_bubble_color: '#C8860A',
      user_text_color: '#FFFFFF',
    },
    logo_url: null,
    bot_display_name: 'Chat with us',
    greeting_message: 'Welcome! How may I assist you?',
    bubble_position: 'bottom-right',
  };

  function fetchConfig() {
    return fetch(CONFIG_URL, {
      headers: { 'X-API-Key': apiKey },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('config fetch failed');
        return res.json();
      })
      .catch(function (err) {
        console.warn('[AthenaChat] Could not load config, using defaults.', err);
        return DEFAULT_CONFIG;
      });
  }

  // ── Step 4: Build chat UI ──────────────────────────────────────
  function applyTheme(config) {
    const theme = Object.assign({}, DEFAULT_CONFIG.theme_color, config.theme_color || {});

    if (config.bubble_position === 'bottom-left') {
      host.style.left = '20px';
      host.style.right = 'auto';
    } else {
      host.style.right = '20px';
      host.style.left = 'auto';
    }

    const chatWindow = shadowRoot.querySelector('.ac-window');
    const header = shadowRoot.querySelector('.ac-header');
    const bubble = shadowRoot.querySelector('.ac-bubble');
    const sendBtn = shadowRoot.querySelector('.ac-send');

    chatWindow.style.background = theme.background_color;
    header.style.background = theme.primary_color;
    bubble.style.background = theme.primary_color;
    sendBtn.style.background = theme.primary_color;

    shadowRoot.querySelectorAll('.ac-msg-bot').forEach(function (el) {
      el.style.background = theme.bot_bubble_color;
      el.style.color = theme.text_color;
    });
    shadowRoot.querySelectorAll('.ac-msg-user').forEach(function (el) {
      el.style.background = theme.user_bubble_color;
      el.style.color = theme.user_text_color;
    });

    // position window to match bubble side
    if (config.bubble_position === 'bottom-left') {
      chatWindow.style.left = '0';
      chatWindow.style.right = 'auto';
    } else {
      chatWindow.style.right = '0';
      chatWindow.style.left = 'auto';
    }
  }

  function addMessage(text, sender) {
    const messages = shadowRoot.querySelector('.ac-messages');
    const el = document.createElement('div');
    el.className = 'ac-msg ' + (sender === 'user' ? 'ac-msg-user' : 'ac-msg-bot');
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function sendMessage(question, config, theme) {
    const input = shadowRoot.querySelector('.ac-input');
    const sendBtn = shadowRoot.querySelector('.ac-send');

    addMessage(question, 'user');
    input.value = '';
    sendBtn.disabled = true;

    const thinkingEl = addMessage('...', 'bot');
    thinkingEl.style.background = theme.bot_bubble_color;
    thinkingEl.style.color = theme.text_color;

    fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        const answer = (data && (data.answer || (data.data && data.data.answer)))
          || "Sorry, I couldn't find an answer to that.";
        thinkingEl.textContent = answer;
      })
      .catch(function () {
        thinkingEl.textContent = "Something went wrong. Please try again.";
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  }

  function buildUI(config) {
    const theme = Object.assign({}, DEFAULT_CONFIG.theme_color, config.theme_color || {});

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="ac-window">
        <div class="ac-header">
          ${config.logo_url ? '<img src="' + config.logo_url + '" alt="logo">' : ''}
          <div class="ac-header-name">${config.bot_display_name || DEFAULT_CONFIG.bot_display_name}</div>
        </div>
        <div class="ac-messages"></div>
        <div class="ac-input-row">
          <input class="ac-input" type="text" placeholder="Type a message..." />
          <button class="ac-send" aria-label="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>
      <button class="ac-bubble" aria-label="Open chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      </button>
    `;
    shadowRoot.appendChild(wrapper);

    applyTheme(config);
    addMessage(config.greeting_message || DEFAULT_CONFIG.greeting_message, 'bot');

    const bubble = shadowRoot.querySelector('.ac-bubble');
    const chatWindow = shadowRoot.querySelector('.ac-window');
    const input = shadowRoot.querySelector('.ac-input');
    const sendBtn = shadowRoot.querySelector('.ac-send');

    bubble.addEventListener('click', function () {
      chatWindow.classList.toggle('ac-open');
    });

    function handleSend() {
      const question = input.value.trim();
      if (!question) return;
      sendMessage(question, config, theme);
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSend();
    });
  }

  // ── Init ────────────────────────────────────────────────────────
  fetchConfig().then(buildUI);

})();