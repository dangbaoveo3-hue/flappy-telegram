# Flappy Multiplayer for Telegram (Socket.IO)

A minimal real-time Flappy-like multiplayer built with **Node.js + Express + Socket.IO** and a Canvas client.
Designed to be embedded as a Telegram HTML5 Game.

## Features
- Real-time positions broadcast with Socket.IO
- Deterministic pipes across clients using a shared random seed/time
- Simple physics (gravity, flap velocity)
- Multiple players visible at once
- Ready to host and open inside Telegram In-App Browser

## Quick Start
```bash
# 1) Install deps
npm install

# 2) Run
npm run start
# open http://localhost:3000
```

Type your name and a room id (like `lobby`) then press Join. Share the URL with friends (or use the same room id) to play together.

## How it works
- **Server** assigns a `seed` and `startTime`, sends to all clients.
- **Clients** generate pipes deterministically (LCG PRNG) using the same `seed` and spawn interval.
- Each client simulates their own bird locally and sends state to the server at ~20 Hz.
- Server relays states to everyone in the same room.

> This is a *client-authoritative* MVP to keep it simple. For cheating prevention or strict fairness, make the server authoritative for pipes and collisions.

## Telegram Integration (HTML5 Game)
1. Create a bot via `@BotFather` → get `BOT_TOKEN`.
2. Create a **Game** via `@BotFather` → `/newgame` (provide short name, title, description, and the game URL you will host).
3. Host this app (Render, Railway, Fly.io, VPS, etc.). Make sure it’s reachable over HTTPS.
4. From your bot code, you can send the game with `sendGame`:
   - Node example (Telegraf):
     ```js
     bot.command('play', (ctx) => ctx.replyWithGame('YOUR_GAME_SHORT_NAME'));
     ```
5. In `index.html`, you may want to integrate `TelegramGameProxy` or read `tg://` context (_optional_). The current demo runs without it.

**Scores:** Use Telegram Bot API methods `setGameScore`/`getGameHighScores` after a run ends. (You’ll need a small endpoint on your server to verify the user and forward score updates to the Bot API.)

## Hardening roadmap (next steps)
- Server-authoritative pipes and collision detection.
- Room matchmaking and per-chat rooms (map Telegram `chat.id` to `roomId`).
- Anti-cheat (server validates score against pipe timeline).
- Spectator mode and reconnection handling.
- Persistent leaderboard in a database (Redis/MongoDB).

## Config
See `server.js` → `room.config`:
- `gravity`, `flapVelocity`, `pipeSpeed`, `gap`, `spawnIntervalMs`, `groundY`, `worldWidth`, `worldHeight`.

## License
MIT
