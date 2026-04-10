# Ikariam Telegram Notifier 🔔

Chrome extension that sends **Telegram notifications** when events happen in [Ikariam](https://ikariam.gameforge.com) — attacks, diplomacy, research, city alerts.
Available at: https://chromewebstore.google.com/detail/ikariam-telegram-notifier/nfhkgdnndnjmpfeaknfcggelajplmnag
## Features

- **🚨 Attack alerts** — Repeated urgent messages when your city is under attack
- **🏛️ City notifications** — Building completed, resource issues
- **🔬 Research alerts** — Research completed
- **🤝 Diplomacy alerts** — New diplomatic events
- **⚙️ Easy setup** — Just enter your Telegram Chat ID
- **🔄 Real-time** — MutationObserver + polling for instant detection

## Installation

1. Download or clone this repo
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** → select the extension folder
5. Click the extension icon → enter your Chat ID → Save

## Getting your Chat ID

1. Open Telegram → search **@ikariam_benja_bot**
2. Tap **Start** and send any message
3. Open [this link](https://api.telegram.org/bot8619128689:AAHKQl89carjhAF1b-3RMKI9eqUGIlrysyU/getUpdates)
4. Find `"chat":{"id": 123456789}` → that number is your Chat ID
5. Paste it in the extension popup and click Save

## Console Commands

On the Ikariam tab, open DevTools (F12) and use:

```javascript
ikariamDump()         // Show current advisor state
ikariamTestTelegram() // Send a test message
ikariamTestAttack()   // Simulate an attack alert
```

## Author

**trucdefou** — [GitHub](https://github.com/trucdefou)

## License

MIT
