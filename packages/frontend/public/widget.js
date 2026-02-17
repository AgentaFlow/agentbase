/**
 * Agentbase Embeddable Chat Widget
 * Usage: <script src="https://your-agentbase.com/widget.js" data-app-id="xxx" data-api-key="ab_xxx"></script>
 */
(function() {
  'use strict';

  const WIDGET_VERSION = '1.0.0';
  const script = document.currentScript;
  const appId = script?.getAttribute('data-app-id') || '';
  const apiKey = script?.getAttribute('data-api-key') || '';
  const apiUrl = script?.getAttribute('data-api-url') || 'http://localhost:3001/api';
  const aiUrl = script?.getAttribute('data-ai-url') || 'http://localhost:8000/api';
  const theme = script?.getAttribute('data-theme') || 'default';
  const position = script?.getAttribute('data-position') || 'bottom-right';
  const title = script?.getAttribute('data-title') || 'Chat with us';
  const placeholder = script?.getAttribute('data-placeholder') || 'Type a message...';
  const greeting = script?.getAttribute('data-greeting') || '';

  if (!appId || !apiKey) {
    console.error('[Agentbase Widget] data-app-id and data-api-key are required');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #ab-widget-container {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      z-index: 999999;
      font-family: var(--ab-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      font-size: var(--ab-font-size, 14px);
      line-height: var(--ab-line-height, 1.5);
    }
    #ab-widget-toggle {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: var(--ab-color-primary, #4F46E5);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, background 0.2s;
    }
    #ab-widget-toggle:hover { transform: scale(1.05); background: var(--ab-color-primary-hover, #4338CA); }
    #ab-widget-toggle svg { width: 24px; height: 24px; }
    #ab-widget-panel {
      display: none;
      position: absolute;
      ${position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
      ${position.includes('right') ? 'right: 0;' : 'left: 0;'}
      width: var(--ab-widget-width, 380px);
      height: var(--ab-widget-height, 560px);
      background: var(--ab-color-background, #fff);
      border-radius: var(--ab-border-radius, 12px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--ab-color-border, #E2E8F0);
    }
    #ab-widget-panel.open { display: flex; }
    #ab-widget-header {
      padding: 14px var(--ab-padding, 16px);
      background: var(--ab-color-primary, #4F46E5);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #ab-widget-header h3 { margin: 0; font-size: var(--ab-header-size, 16px); font-weight: 600; }
    #ab-widget-close { background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 4px; }
    #ab-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--ab-padding, 16px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--ab-color-surface, #F8FAFC);
    }
    .ab-msg { max-width: 80%; padding: 10px 14px; border-radius: var(--ab-bubble-radius, 16px); word-wrap: break-word; font-size: inherit; }
    .ab-msg-user { align-self: flex-end; background: var(--ab-color-user-bubble, #4F46E5); color: var(--ab-color-user-bubble-text, #fff); }
    .ab-msg-assistant { align-self: flex-start; background: var(--ab-color-assistant-bubble, #F1F5F9); color: var(--ab-color-assistant-bubble-text, #1E293B); }
    .ab-msg-typing { align-self: flex-start; background: var(--ab-color-assistant-bubble, #F1F5F9); color: var(--ab-color-text-muted, #64748B); font-style: italic; }
    #ab-widget-input-area {
      padding: 12px var(--ab-padding, 16px);
      border-top: 1px solid var(--ab-color-border, #E2E8F0);
      display: flex;
      gap: 8px;
      background: var(--ab-color-background, #fff);
    }
    #ab-widget-input {
      flex: 1; padding: 8px 12px; border: 1px solid var(--ab-color-input-border, #E2E8F0);
      border-radius: 8px; outline: none; font-size: inherit; font-family: inherit;
      background: var(--ab-color-input-bg, #fff); color: var(--ab-color-text, #1E293B);
    }
    #ab-widget-input:focus { border-color: var(--ab-color-input-focus, #4F46E5); box-shadow: 0 0 0 2px rgba(79,70,229,0.1); }
    #ab-widget-send {
      padding: 8px 16px; background: var(--ab-color-primary, #4F46E5); color: white;
      border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: inherit;
    }
    #ab-widget-send:disabled { opacity: 0.5; cursor: not-allowed; }
    #ab-widget-send:hover:not(:disabled) { background: var(--ab-color-primary-hover, #4338CA); }
    .ab-powered { text-align: center; padding: 6px; font-size: 11px; color: var(--ab-color-text-muted, #94A3B8); }
    .ab-powered a { color: inherit; text-decoration: none; }
    @media (max-width: 480px) {
      #ab-widget-panel { width: calc(100vw - 40px); height: calc(100vh - 120px); }
    }
  `;
  document.head.appendChild(style);

  // Build widget HTML
  const container = document.createElement('div');
  container.id = 'ab-widget-container';
  container.innerHTML = `
    <div id="ab-widget-panel">
      <div id="ab-widget-header">
        <h3>${title}</h3>
        <button id="ab-widget-close">&times;</button>
      </div>
      <div id="ab-widget-messages"></div>
      <div id="ab-widget-input-area">
        <input id="ab-widget-input" type="text" placeholder="${placeholder}" />
        <button id="ab-widget-send">Send</button>
      </div>
      <div class="ab-powered"><a href="https://agentbase.dev" target="_blank">Powered by Agentbase</a></div>
    </div>
    <button id="ab-widget-toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>
  `;
  document.body.appendChild(container);

  // Widget state
  let isOpen = false;
  let conversationId = null;
  let sending = false;
  const sessionId = 'widget_' + Math.random().toString(36).slice(2);

  const panel = document.getElementById('ab-widget-panel');
  const toggle = document.getElementById('ab-widget-toggle');
  const closeBtn = document.getElementById('ab-widget-close');
  const messagesDiv = document.getElementById('ab-widget-messages');
  const input = document.getElementById('ab-widget-input');
  const sendBtn = document.getElementById('ab-widget-send');

  function toggleWidget() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    if (isOpen && greeting && messagesDiv.children.length === 0) {
      addMessage('assistant', greeting);
    }
    if (isOpen) input.focus();
  }

  toggle.addEventListener('click', toggleWidget);
  closeBtn.addEventListener('click', toggleWidget);

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `ab-msg ab-msg-${role}`;
    div.textContent = content;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const content = input.value.trim();
    if (!content || sending) return;

    input.value = '';
    addMessage('user', content);
    sending = true;
    sendBtn.disabled = true;

    const typingDiv = addMessage('typing', 'Thinking...');

    try {
      const response = await fetch(`${apiUrl}/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      conversationId = data.conversationId;
      typingDiv.remove();
      addMessage('assistant', data.response);
    } catch (err) {
      typingDiv.remove();
      addMessage('assistant', 'Sorry, something went wrong. Please try again.');
      console.error('[Agentbase Widget]', err);
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });

  // Track widget load
  fetch(`${apiUrl}/v1/chat`, {
    method: 'OPTIONS',
    headers: { 'X-API-Key': apiKey },
  }).catch(() => {});

  console.log(`[Agentbase Widget v${WIDGET_VERSION}] Loaded for app: ${appId}`);
})();
