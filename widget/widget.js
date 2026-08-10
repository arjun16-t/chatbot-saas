(function () {
  'use strict';

  // ── Bootstrap ────────────────────────────────────────────────────
  // Must read currentScript synchronously, before any await/async work.
  const currentScript = document.currentScript;

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

  const API_BASE = new URL(currentScript.src).origin;
  const CONFIG_URL = API_BASE + '/api/widget/config/';
  const CHAT_URL = API_BASE + '/api/chat/';

  const DEFAULT_CONFIG = {
    theme_color: {
      primary_color: '#C8860A',
      secondary_color: '#F5C842',
      background_color: '#FFFDF5',
      text_color: '#111111',
      bot_bubble_color: '#FFFFFF',
      user_bubble_color: '#FCEFD4',
      user_text_color: '#111111',
    },
    logo_url: null,
    bot_display_name: 'AthenaChat',
    greeting_message: 'Welcome! How may I assist you?',
    bubble_position: 'bottom-right',
  };

  // Default icon shown in header/avatar/toggle when no logo_url is set.
  const DEFAULT_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="4" y="8" width="16" height="12" rx="4"/>' +
    '<circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none"/>' +
    '<circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none"/>' +
    '<path d="M12 8V4"/>' +
    '<circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/>' +
    '<path d="M2 13h2M20 13h2"/>' +
    '</svg>';

  // ── Styles ───────────────────────────────────────────────────────
  const WIDGET_STYLES = `
    /* Loaded here, inside the shadow root's own stylesheet, so the
       widget renders correctly regardless of whether the host page
       has ever loaded Inter itself -- shadow DOM isolation means a
       host page's own <link> to Google Fonts does NOT guarantee
       availability inside this shadow tree. */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; }

    .ac-bubble {
      width: 60px; height: 60px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; border: none; box-shadow: 0 4px 14px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }
    .ac-bubble:hover { transform: scale(1.05); }
    .ac-bubble svg { width: 28px; height: 28px; color: #fff; }
    .ac-bubble img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }

    .ac-window {
      display: none;
      flex-direction: column;
      width: min(320px, 90vw);
      height: min(440px, 65vh);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      border: 1px solid rgba(0,0,0,0.06);
      position: absolute;
      bottom: 76px;
      margin-bottom: 8px;
    }
    .ac-window.ac-open { display: flex; }

    .ac-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      color: #fff;
      flex-shrink: 0;
    }
    .ac-header-icon { width: 30px; height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .ac-header-icon svg { width: 100%; height: 100%; color: #fff; }
    .ac-header-icon img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .ac-header-name { font-weight: 600; font-size: 16px; flex: 1; }
    .ac-header-btn {
      cursor: pointer; opacity: 0.9; font-size: 18px; padding: 2px 6px;
      background: none; border: none; color: #fff; line-height: 1;
    }
    .ac-header-btn:hover { opacity: 1; }

    .ac-messages {
      flex: 1; overflow-y: auto; padding: 18px 14px;
      display: flex; flex-direction: column;
    }

    .ac-row { display: flex; flex-direction: column; margin-bottom: 14px; }
    .ac-row.ac-user { align-items: flex-end; }
    .ac-row.ac-bot { align-items: flex-start; }

    .ac-bubble-line { display: flex; align-items: flex-end; gap: 8px; max-width: 88%; }

    .ac-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.08);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; overflow: hidden;
    }
    .ac-avatar svg { width: 16px; height: 16px; }
    .ac-avatar img { width: 100%; height: 100%; object-fit: cover; }

    .ac-msg {
      padding: 11px 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-wrap: break-word;
    }
    .ac-msg.ac-user { border-radius: 16px 16px 4px 16px; }
    .ac-msg.ac-bot { border: 1px solid rgba(0,0,0,0.08); border-radius: 16px 16px 16px 4px; }

    .ac-meta {
      font-size: 11px; color: #999;
      margin-top: 5px; padding: 0 4px;
      display: flex; align-items: center; gap: 4px;
    }
    .ac-meta.ac-user { justify-content: flex-end; }
    .ac-meta.ac-bot { padding-left: 38px; }
    .ac-check { font-size: 11px; }

    .ac-typing {
      display: flex; gap: 4px;
      padding: 13px 15px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px 16px 16px 4px;
      width: fit-content;
    }
    .ac-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      opacity: 0.4;
      animation: ac-bounce 1.2s infinite ease-in-out;
    }
    .ac-typing span:nth-child(2) { animation-delay: 0.15s; }
    .ac-typing span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes ac-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .ac-input-row {
      display: flex; align-items: center; gap: 8px;
      padding: 12px; flex-shrink: 0;
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    .ac-input {
      flex: 1; border-radius: 22px;
      padding: 10px 15px; font-size: 13.5px; outline: none;
      background: #fff;
    }
    .ac-send {
      border: none; background: none; cursor: pointer;
      padding: 6px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ac-send svg { width: 20px; height: 20px; }
    .ac-send:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  // ── Shadow DOM host ──────────────────────────────────────────────
  function createWidgetHost() {
    const host = document.createElement('div');
    host.id = 'athenachat-widget-host';
    host.style.cssText = 'position: fixed; z-index: 2147483647; bottom: 20px; right: 20px;';
    document.body.appendChild(host);
    return { host: host, shadowRoot: host.attachShadow({ mode: 'open' }) };
  }

  const { host, shadowRoot } = createWidgetHost();

  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_STYLES;
  shadowRoot.appendChild(styleEl);

  // ── Helpers ──────────────────────────────────────────────────────
  function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function iconMarkup(logoUrl, className) {
    if (logoUrl) {
      return '<img src="' + logoUrl + '" alt="" class="' + className + '">';
    }
    return DEFAULT_ICON_SVG;
  }

  // ── Config fetch ─────────────────────────────────────────────────
  function fetchConfig() {
    return fetch(CONFIG_URL, { headers: { 'X-API-Key': apiKey } })
      .then(function (res) {
        if (!res.ok) throw new Error('config fetch failed');
        return res.json();
      })
      .then(function (data) {
        return {
          theme_color: Object.assign({}, DEFAULT_CONFIG.theme_color, data.theme_color || {}),
          logo_url: data.logo_url || null,
          bot_display_name: data.bot_display_name || DEFAULT_CONFIG.bot_display_name,
          greeting_message: data.greeting_message || DEFAULT_CONFIG.greeting_message,
          bubble_position: data.bubble_position || DEFAULT_CONFIG.bubble_position,
        };
      })
      .catch(function (err) {
        console.warn('[AthenaChat] Could not load config, using defaults.', err);
        return DEFAULT_CONFIG;
      });
  }

  // ── UI building ──────────────────────────────────────────────────
  function applyTheme(config) {
    const theme = config.theme_color;

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
    const input = shadowRoot.querySelector('.ac-input');

    chatWindow.style.background = theme.background_color;
    header.style.background = theme.primary_color;
    bubble.style.background = theme.primary_color;
    input.style.border = '1px solid ' + theme.primary_color + '55';
    input.style.color = theme.text_color;
    shadowRoot.querySelector('.ac-input-row').style.borderTop = '1px solid ' + theme.primary_color + '33';

    shadowRoot.querySelectorAll('.ac-send svg').forEach(function (el) {
      el.style.stroke = theme.primary_color;
    });
    shadowRoot.querySelectorAll('.ac-avatar').forEach(function (el) {
      el.style.background = theme.secondary_color + '33';
      el.style.color = theme.primary_color;
    });
    shadowRoot.querySelectorAll('.ac-typing span').forEach(function (el) {
      el.style.background = theme.primary_color;
    });

    if (config.bubble_position === 'bottom-left') {
      chatWindow.style.left = '0'; chatWindow.style.right = 'auto';
    } else {
      chatWindow.style.right = '0'; chatWindow.style.left = 'auto';
    }
  }

  function addUserMessage(text, theme) {
    const messages = shadowRoot.querySelector('.ac-messages');
    const row = document.createElement('div');
    row.className = 'ac-row ac-user';
    row.innerHTML =
      '<div class="ac-bubble-line"><div class="ac-msg ac-user">' + escapeHtml(text) + '</div></div>' +
      '<div class="ac-meta ac-user">You &bull; ' + timeNow() + ' <span class="ac-check">&#10003;</span></div>';
    row.querySelector('.ac-msg').style.background = theme.user_bubble_color;
    row.querySelector('.ac-msg').style.color = theme.user_text_color;
    row.querySelector('.ac-check').style.color = theme.primary_color;
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function addTypingIndicator(config) {
    const messages = shadowRoot.querySelector('.ac-messages');
    const row = document.createElement('div');
    row.className = 'ac-row ac-bot';
    row.id = 'ac-typing-row';
    row.innerHTML =
      '<div class="ac-bubble-line">' +
      '<div class="ac-avatar">' + iconMarkup(config.logo_url, '') + '</div>' +
      '<div class="ac-typing"><span></span><span></span><span></span></div>' +
      '</div>';
    row.querySelectorAll('.ac-typing span').forEach(function (el) {
      el.style.background = config.theme_color.primary_color;
    });
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function replaceTypingWithMessage(row, text, config) {
    const theme = config.theme_color;
    row.innerHTML =
      '<div class="ac-bubble-line">' +
      '<div class="ac-avatar">' + iconMarkup(config.logo_url, '') + '</div>' +
      '<div class="ac-msg ac-bot">' + escapeHtml(text) + '</div>' +
      '</div>' +
      '<div class="ac-meta ac-bot">' + escapeHtml(config.bot_display_name) + ' &bull; ' + timeNow() + '</div>';
    row.querySelector('.ac-msg').style.background = theme.bot_bubble_color;
    row.querySelector('.ac-msg').style.color = theme.text_color;
    row.querySelector('.ac-avatar').style.background = theme.secondary_color + '33';
    row.querySelector('.ac-avatar').style.color = theme.primary_color;
    row.id = '';
    const messages = shadowRoot.querySelector('.ac-messages');
    messages.scrollTop = messages.scrollHeight;
  }

  function sendMessage(question, config) {
    const input = shadowRoot.querySelector('.ac-input');
    const sendBtn = shadowRoot.querySelector('.ac-send');

    addUserMessage(question, config.theme_color);
    input.value = '';
    sendBtn.disabled = true;

    const typingRow = addTypingIndicator(config);

    fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ question: question }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        const answer = (data && (data.answer || (data.data && data.data.answer)))
          || "Sorry, I couldn't find an answer to that.";
        replaceTypingWithMessage(typingRow, answer, config);
      })
      .catch(function () {
        replaceTypingWithMessage(typingRow, 'Something went wrong. Please try again.', config);
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
  }

  function buildUI(config) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="ac-window">' +
      '  <div class="ac-header">' +
      '    <div class="ac-header-icon">' + iconMarkup(config.logo_url, '') + '</div>' +
      '    <div class="ac-header-name">' + escapeHtml(config.bot_display_name) + '</div>' +
      '    <button class="ac-header-btn ac-close" aria-label="Close">&times;</button>' +
      '  </div>' +
      '  <div class="ac-messages"></div>' +
      '  <div class="ac-input-row">' +
      '    <input class="ac-input" type="text" placeholder="Type a message..." />' +
      '    <button class="ac-send" aria-label="Send">' +
      '      <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>' +
      '    </button>' +
      '  </div>' +
      '</div>' +
      '<button class="ac-bubble" aria-label="Toggle chat">' + iconMarkup(config.logo_url, '') + '</button>';
    shadowRoot.appendChild(wrapper);

    applyTheme(config);

    const chatWindow = shadowRoot.querySelector('.ac-window');
    const bubble = shadowRoot.querySelector('.ac-bubble');
    const closeBtn = shadowRoot.querySelector('.ac-close');
    const input = shadowRoot.querySelector('.ac-input');
    const sendBtn = shadowRoot.querySelector('.ac-send');

    let greeted = false;
    function openWindow() {
      chatWindow.classList.add('ac-open');
      // Bubble deliberately stays visible while the window is open --
      // it now doubles as the toggle-closed control, not just an
      // "open chat" trigger.
      if (!greeted) {
        // fake bot avatar row for the greeting, styled like a normal bot message
        const row = document.createElement('div');
        row.className = 'ac-row ac-bot';
        const messages = shadowRoot.querySelector('.ac-messages');
        row.innerHTML =
          '<div class="ac-bubble-line">' +
          '<div class="ac-avatar">' + iconMarkup(config.logo_url, '') + '</div>' +
          '<div class="ac-msg ac-bot">' + escapeHtml(config.greeting_message) + '</div>' +
          '</div>' +
          '<div class="ac-meta ac-bot">' + escapeHtml(config.bot_display_name) + ' &bull; ' + timeNow() + '</div>';
        row.querySelector('.ac-msg').style.background = config.theme_color.bot_bubble_color;
        row.querySelector('.ac-msg').style.color = config.theme_color.text_color;
        row.querySelector('.ac-avatar').style.background = config.theme_color.secondary_color + '33';
        row.querySelector('.ac-avatar').style.color = config.theme_color.primary_color;
        messages.appendChild(row);
        greeted = true;
      }
    }
    function closeWindow() {
      chatWindow.classList.remove('ac-open');
    }
    function toggleWindow() {
      if (chatWindow.classList.contains('ac-open')) {
        closeWindow();
      } else {
        openWindow();
      }
    }

    bubble.addEventListener('click', toggleWindow);
    closeBtn.addEventListener('click', closeWindow);

    function handleSend() {
      const question = input.value.trim();
      if (!question) return;
      sendMessage(question, config);
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSend();
    });
  }

  // ── Init ────────────────────────────────────────────────────────
  fetchConfig().then(buildUI);

})();

