// Background service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'SEND_TELEGRAM') return false;

  chrome.storage.sync.get(['botToken', 'chatId'], (config) => {
    if (!config.botToken) {
      console.warn('[Ikariam BG] No bot token — open extension popup to configure');
      sendResponse({ ok: false, error: 'No bot token configured' });
      return;
    }
    if (!config.chatId) {
      console.warn('[Ikariam BG] No chat ID — open extension popup to configure');
      sendResponse({ ok: false, error: 'No chat ID configured' });
      return;
    }

    const api = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

    fetch(api, {
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
