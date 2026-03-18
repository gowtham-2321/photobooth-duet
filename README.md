# The Candid Archive — Photobooth

A virtual photobooth with solo mode and real-time Duet Mode using Socket.io.

---

## Project Structure

```
photobooth/
├── server.js          ← Node.js + Socket.io server
├── package.json
├── railway.toml       ← Railway deployment config
└── public/
    └── index.html     ← The entire frontend
```

---

## Run Locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

---

## Deploy to Railway (Recommended)

Railway supports persistent websocket connections — perfect for Socket.io.

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign in
3. Click **New Project → Deploy from GitHub repo**
4. Select your repo — Railway auto-detects Node.js
5. It deploys automatically. Copy the generated URL (e.g. `https://photobooth-production.up.railway.app`)
6. Share that URL with anyone — Duet Mode will work across any network

Railway free tier gives you $5/month of compute which is plenty for personal use.

---

## How Duet Mode Works (Server-Based)

```
Person A                   Your Server (Railway)               Person B
   |                              |                               |
   |── create_room(ABC12) ───────►|                               |
   |◄─ room_created ─────────────|                               |
   |                              |◄── join_room(ABC12) ──────────|
   |◄─ partner_joined ───────────|─── joined_room ──────────────►|
   |                              |                               |
   |── set_filter(warm) ─────────|─── filter_changed ───────────►|
   |── start_booth ──────────────|─── booth_started ────────────►|
   |                              |                               |
   |── ready ────────────────────|─── partner_ready ────────────►|
   |◄─ partner_ready ────────────|────────────────── ready ───────|
   |                              |                               |
   |── countdown(3,2,1,0) ───────|─── countdown ────────────────►|
   |── fire ─────────────────────|─── fire ─────────────────────►|
   |── photo(shot, data) ────────|─── photo ────────────────────►|
   |◄─ photo ────────────────────|────────────── photo(data) ─────|
```

All signalling goes through your server. No WebRTC, no STUN/TURN, no third-party dependencies — just Socket.io websockets.
