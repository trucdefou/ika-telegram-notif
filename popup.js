const $botToken = document.getElementById('botToken');
const $chatId = document.getElementById('chatId');
const $serverCode = document.getElementById('serverCode');
const $save = document.getElementById('btnSave');
const $test = document.getElementById('btnTest');
const $msg = document.getElementById('savedMsg');
const $status = document.getElementById('statusBar');
const $statusText = document.getElementById('statusText');
const $getUpdatesLink = document.getElementById('getUpdatesLink');

// Update the getUpdates link dynamically as the user types the token
function updateGetUpdatesLink() {
  const token = $botToken.value.trim();
  if (token) {
    $getUpdatesLink.href = `https://api.telegram.org/bot${token}/getUpdates`;
  } else {
    $getUpdatesLink.removeAttribute('href');
  }
}
$botToken.addEventListener('input', updateGetUpdatesLink);

const $notifStartup  = document.getElementById('notifStartup');
const $notifCities   = document.getElementById('notifCities');
const $notifMilitary = document.getElementById('notifMilitary');
const $notifResearch = document.getElementById('notifResearch');
const $notifDiplomacy = document.getElementById('notifDiplomacy');

function getNotifPrefs() {
  return {
    startup:  $notifStartup.checked,
    cities:   $notifCities.checked,
    military: $notifMilitary.checked,
    research: $notifResearch.checked,
    diplomacy: $notifDiplomacy.checked,
  };
}

function applyNotifPrefs(prefs) {
  if (!prefs) return;
  $notifStartup.checked  = prefs.startup  !== false;
  $notifCities.checked   = prefs.cities   !== false;
  $notifMilitary.checked = prefs.military !== false;
  $notifResearch.checked = prefs.research !== false;
  $notifDiplomacy.checked = prefs.diplomacy !== false;
}

// Auto-save toggles immediately when changed
[$notifStartup, $notifCities, $notifMilitary, $notifResearch, $notifDiplomacy].forEach((el) => {
  el.addEventListener('change', () => {
    chrome.storage.sync.set({ notifications: getNotifPrefs() });
  });
});

function flash(text, color) {
  $msg.textContent = text;
  $msg.style.color = color || '#4ade80';
  $msg.classList.add('show');
  setTimeout(() => $msg.classList.remove('show'), 2500);
}

function updateStatus(configured) {
  if (configured) {
    $status.className = 'status-bar connected';
    $statusText.textContent = 'Configured — monitoring active';
  } else {
    $status.className = 'status-bar disconnected';
    $statusText.textContent = 'Not configured';
  }
}

// Load saved config
chrome.storage.sync.get(['botToken', 'chatId', 'serverCode', 'notifications'], (data) => {
  if (data.botToken) $botToken.value = data.botToken;
  if (data.chatId) $chatId.value = data.chatId;
  if (data.serverCode) $serverCode.value = data.serverCode;
  updateStatus(!!data.botToken && !!data.chatId);
  applyNotifPrefs(data.notifications);
  updateGetUpdatesLink();
});

// Save
$save.addEventListener('click', () => {
  const botToken = $botToken.value.trim();
  const chatId = $chatId.value.trim();
  const serverCode = $serverCode.value.trim();
  if (!botToken) {
    flash('Bot Token is required', '#f87171');
    return;
  }
  if (!chatId) {
    flash('Chat ID is required', '#f87171');
    return;
  }
  chrome.storage.sync.set({ botToken, chatId, serverCode, notifications: getNotifPrefs() }, () => {
    flash('✓ Saved');
    updateStatus(true);
  });
});

// Test
$test.addEventListener('click', () => {
  const botToken = $botToken.value.trim();
  const chatId = $chatId.value.trim();
  if (!botToken) {
    flash('Enter your Bot Token first', '#f87171');
    return;
  }
  if (!chatId) {
    flash('Enter your Chat ID first', '#f87171');
    return;
  }
  chrome.storage.sync.set({ botToken, chatId });

  $test.textContent = 'Sending...';
  $test.disabled = true;

  chrome.runtime.sendMessage(
    { type: 'SEND_TELEGRAM', text: '🧪 <b>Test notification</b>\nIkariam Telegram Notifier is working!' },
    (response) => {
      $test.textContent = 'Send Test';
      $test.disabled = false;
      if (chrome.runtime.lastError) {
        flash('Error: ' + chrome.runtime.lastError.message, '#f87171');
        return;
      }
      if (response?.ok) {
        flash('✓ Check your Telegram!');
      } else {
        flash('Failed — check your Chat ID', '#f87171');
      }
    }
  );
});
