// ============================================================
// Ikariam Telegram Notifier — Content Script
// Author:  trucdefou
// GitHub:  https://github.com/trucdefou
// Version: 3.1.0
// ============================================================

(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────────────────────────
  const CHECK_INTERVAL_MS = 5000;
  const NOTIFICATION_COOLDOWN_MS = 120000;
  const ATTACK_COOLDOWN_MS = 30000; // shorter cooldown for attacks
  const ATTACK_REPEAT_COUNT = 3;    // send attack alert 3 times
  const ATTACK_REPEAT_DELAY_MS = 5000; // 5s between each repeat
  const DEBUG = true;

  // ─── ADVISOR TARGETS ───────────────────────────────────────────────
  const ADVISORS = [
    {
      liId: 'advCities',
      aId: 'js_GlobalMenu_cities',
      name: 'Ciudades',
      emoji: '🏛️',
      priority: 'normal',
      notifKey: 'cities',
    },
    {
      liId: 'advMilitary',
      aId: 'js_GlobalMenu_military',
      name: 'Milicia',
      emoji: '⚔️',
      priority: 'critical', // ATTACK ALERT
      notifKey: 'military',
    },
    {
      liId: 'advResearch',
      aId: 'js_GlobalMenu_research',
      name: 'Investigación',
      emoji: '🔬',
      priority: 'normal',
      notifKey: 'research',
    },
    {
      liId: 'advDiplomacy',
      aId: 'js_GlobalMenu_diplomacy',
      name: 'Diplomacia',
      emoji: '🤝',
      priority: 'normal',
      notifKey: 'diplomacy',
    },
  ];

  // ─── STATE ─────────────────────────────────────────────────────────
  const previousState = {};
  const lastNotified = {};

  // Notification preferences (defaults: all enabled)
  const notifEnabled = {
    startup: true,
    cities: true,
    military: true,
    research: true,
    diplomacy: true,
  };

  // Configured server code (empty = auto-detect from hostname)
  let configuredServer = '';

  function loadNotifPrefs(callback) {
    chrome.storage.sync.get(['notifications', 'serverCode'], (data) => {
      if (data.notifications) {
        Object.assign(notifEnabled, data.notifications);
      }
      if (data.serverCode) {
        configuredServer = data.serverCode;
      }
      if (callback) callback();
    });
  }

  // Keep preferences in sync if the user changes them in the popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.notifications) {
      Object.assign(notifEnabled, changes.notifications.newValue);
      log('🔧 Notification preferences updated:', notifEnabled);
    }
    if (changes.serverCode) {
      configuredServer = changes.serverCode.newValue || '';
      log('🔧 Server updated:', configuredServer || '(auto)');
    }
  });

  // ─── HELPERS ───────────────────────────────────────────────────────

  function log(...args) {
    if (DEBUG) console.log('[Ikariam TG]', ...args);
  }

  function shouldNotify(key, isCritical) {
    const now = Date.now();
    const cooldown = isCritical ? ATTACK_COOLDOWN_MS : NOTIFICATION_COOLDOWN_MS;
    if (lastNotified[key] && now - lastNotified[key] < cooldown) {
      return false;
    }
    lastNotified[key] = now;
    return true;
  }

  function getServer() {
    return configuredServer || window.location.hostname.split('.')[0];
  }

  // ─── TELEGRAM ──────────────────────────────────────────────────────

  function sendTelegram(text, silent = false) {
    log('📨 Sending:', text);
    chrome.runtime.sendMessage(
      { type: 'SEND_TELEGRAM', text: text, silent: silent },
      (response) => {
        if (chrome.runtime.lastError) {
          log('❌ Runtime error:', chrome.runtime.lastError.message);
          return;
        }
        log(response?.ok ? '✅ Sent' : '❌ Failed:', response?.error || '');
      }
    );
  }

  function sendNormalAlert(advisor) {
    const server = getServer();
    sendTelegram(
      `${advisor.emoji} <b>Ikariam — ${advisor.name}</b>\n` +
      `Nueva notificación en ${advisor.name}\n` +
      `🌐 Servidor: ${server}`
    );
  }

  function sendAttackAlert(advisor) {
    const server = getServer();
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // First message — loud and clear
    sendTelegram(
      `🚨🚨🚨 <b>¡¡¡ATAQUE DETECTADO!!!</b> 🚨🚨🚨\n\n` +
      `⚔️ <b>Tu ciudad está siendo atacada</b>\n` +
      `🌐 Servidor: ${server}\n` +
      `🕐 Hora: ${timestamp}\n\n` +
      `‼️ <b>¡Revisá Ikariam AHORA!</b>`
    );

    // Repeat the alert to make sure it's noticed
    for (let i = 1; i < ATTACK_REPEAT_COUNT; i++) {
      setTimeout(() => {
        sendTelegram(
          `🔴 <b>RECORDATORIO #${i} — ¡ATAQUE EN CURSO!</b>\n` +
          `⚔️ Revisá tu milicia en ${server}\n` +
          `🕐 Detectado a las ${timestamp}`
        );
      }, ATTACK_REPEAT_DELAY_MS * i);
    }
  }

  // ─── DETECTION LOGIC ──────────────────────────────────────────────

  function isAdvisorActive(advisor) {
    const li = document.getElementById(advisor.liId);
    const a = document.getElementById(advisor.aId);
    if (!li || !a) return false;

    const aClass = a.className.trim();
    const aHasNotif = aClass !== 'normal' && aClass !== '' && aClass !== 'noViewParameters';

    const liClasses = li.className.trim().split(/\s+/).filter((c) => c !== 'advisor_bubble');
    const liHasExtra = liClasses.length > 0;

    const liStyle = window.getComputedStyle(li);
    const hasAnimation = liStyle.animationName !== 'none' && liStyle.animationName !== '';

    const hasNewChild = li.querySelector(
      '.notification, .alert, .new, .glow, .highlight, [class*="notif"]'
    );

    return aHasNotif || liHasExtra || hasAnimation || !!hasNewChild;
  }

  function checkAllAdvisors() {
    for (const advisor of ADVISORS) {
      const active = isAdvisorActive(advisor);
      const wasActive = previousState[advisor.liId] || false;

      if (active && !wasActive) {
        const isCritical = advisor.priority === 'critical';

        if (notifEnabled[advisor.notifKey] && shouldNotify(advisor.liId, isCritical)) {
          if (isCritical) {
            log('🚨 CRITICAL ALERT:', advisor.name);
            sendAttackAlert(advisor);
          } else {
            log('📬 Normal alert:', advisor.name);
            sendNormalAlert(advisor);
          }
        }
      }

      previousState[advisor.liId] = active;
    }
  }

  // ─── MUTATION OBSERVER ─────────────────────────────────────────────

  function setupObserver() {
    const advisorsDiv = document.getElementById('advisors');
    if (!advisorsDiv) {
      log('⚠️ #advisors not found, retrying in 3s...');
      setTimeout(setupObserver, 3000);
      return;
    }

    const observer = new MutationObserver(() => {
      clearTimeout(observer._debounce);
      observer._debounce = setTimeout(checkAllAdvisors, 300);
    });

    observer.observe(advisorsDiv, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
      characterData: true,
    });

    log('✅ MutationObserver watching #advisors');
  }

  // ─── STATUS BANNER ─────────────────────────────────────────────────

  function showStatusBanner() {
    // Check if configured first
    chrome.storage.sync.get(['botToken', 'chatId'], (config) => {
      const configured = !!config.botToken && !!config.chatId;

      const banner = document.createElement('div');
      banner.id = 'ikariam-notifier-status';
      banner.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: ${configured ? '#7fff7f' : '#f87171'};
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 99999;
        font-family: monospace;
        cursor: pointer;
        transition: opacity 0.3s;
        border: 1px solid ${configured ? '#3a5a3a' : '#5a3a3a'};
      `;
      banner.textContent = configured
        ? '🔔 Notificación por Telegram activa'
        : '⚠️ Notifación por Telegram — click icono extensión para configurar';
      banner.addEventListener('click', () => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
      });
      document.body.appendChild(banner);

      setTimeout(() => {
        if (banner.parentNode) {
          banner.style.opacity = '0';
          setTimeout(() => banner.remove(), 300);
        }
      }, configured ? 5000 : 10000);
    });
  }

  // ─── DEBUG ─────────────────────────────────────────────────────────

  function dumpState() {
    log('--- Advisor state ---');
    for (const advisor of ADVISORS) {
      const li = document.getElementById(advisor.liId);
      const a = document.getElementById(advisor.aId);
      log(
        `${advisor.emoji} ${advisor.name} [${advisor.priority}]: ` +
        `li.class="${li?.className}" a.class="${a?.className}" ` +
        `active=${isAdvisorActive(advisor)}`
      );
    }
    log('---');
  }

  // ─── INIT ──────────────────────────────────────────────────────────

  function init() {
    log('Starting v3.1.0 by trucdefou — https://github.com/trucdefou');

    loadNotifPrefs(() => {
      showStatusBanner();

      for (const advisor of ADVISORS) {
        previousState[advisor.liId] = isAdvisorActive(advisor);
      }

      dumpState();

      // Send startup message only once per session (not on every F5 reload)
      if (notifEnabled.startup && !sessionStorage.getItem('ikariamNotifierStarted')) {
        sessionStorage.setItem('ikariamNotifierStarted', '1');
        chrome.storage.sync.get(['botToken', 'chatId'], (config) => {
          if (config.botToken && config.chatId) {
            sendTelegram(
              `✅ <b>Ikariam Notifier conectado</b>\n` +
              `🌐 Servidor: ${getServer()}\n` +
              `📡 Monitoreando: Ciudades, Milicia, Investigación, Diplomacia\n` +
              `🚨 Alertas de ataque: ACTIVADAS`
            );
          }
        });
      }

      setInterval(checkAllAdvisors, CHECK_INTERVAL_MS);
      setupObserver();

      // Console helpers
      window.ikariamDump = dumpState;
      window.ikariamTestTelegram = () => sendTelegram('🧪 Test manual desde consola');
      window.ikariamTestAttack = () => sendAttackAlert({ name: 'Milicia', emoji: '⚔️', priority: 'critical' });

      log('✅ Ready. Console: ikariamDump() / ikariamTestTelegram() / ikariamTestAttack()');
    });
  }

  if (document.readyState === 'complete') {
    setTimeout(init, 2000);
  } else {
    window.addEventListener('load', () => setTimeout(init, 2000));
  }
})();
