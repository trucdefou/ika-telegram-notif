// Background service worker
// Bot token is fixed — shared by all users
const BOT_TOKEN = '8619128689:AAHKQl89carjhAF1b-3RMKI9eqUGIlrysyU';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'SEND_TELEGRAM') return false;

  chrome.storage.sync.get(['chatId'], (config) => {
    if (!config.chatId) {
      console.warn('[Ikariam BG] Not configured — open extension popup to set Chat ID');
      sendResponse({ ok: false, error: 'Not configured' });
      return;
    }

    fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: msg.text,
        parse_mode: 'HTML',
        disable_notification: msg.silent || false,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          console.log('[Ikariam BG] ✅ Message sent');
        } else {
          console.error('[Ikariam BG] ❌ API error:', data.description);
        }
        sendResponse({ ok: data.ok, error: data.description });
      })
      .catch((err) => {
        console.error('[Ikariam BG] ❌ Fetch error:', err);
        sendResponse({ ok: false, error: err.message });
      });
  });

  return true;
});
