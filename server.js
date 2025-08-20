
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true }));

// ---- Simple PRNG (LCG) for deterministic pipe generation on clients ----
function lcg(seed) {
  let s = seed >>> 0;
  return function() {
    // constants from Numerical Recipes
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

// Room state map
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('joinRoom', ({ roomId, name }) => {
    if (!roomId) roomId = 'lobby';
    socket.join(roomId);
    const room = rooms.get(roomId) || {
      players: new Map(),
      config: {
        gravity: 1800,         // px/s^2
        flapVelocity: -520,    // px/s
        pipeSpeed: 180,        // px/s
        gap: 180,              // px
        spawnIntervalMs: 1500, // ms
        groundY: 520,
        worldWidth: 720,
        worldHeight: 600
      },
      seed: Math.floor(Math.random() * 2**31) >>> 0,
      startTime: Date.now() + 1500 // small delay to sync starts
    };

    // Register player
    room.players.set(socket.id, {
      id: socket.id,
      name: name?.slice(0, 20) || `Player-${socket.id.slice(0,4)}`,
      y: room.config.worldHeight/2,
      vy: 0,
      alive: true,
      score: 0,
    });

    rooms.set(roomId, room);

    // Notify the joining client
    io.to(socket.id).emit('roomInit', {
      roomId,
      you: room.players.get(socket.id),
      players: Array.from(room.players.values()),
      config: room.config,
      seed: room.seed,
      startTime: room.startTime
    });

    // Notify others
    socket.to(roomId).emit('playerJoined', room.players.get(socket.id));

    // Relay player state
    socket.on('state', (payload) => {
      const p = room.players.get(socket.id);
      if (!p) return;
      p.y = payload?.y ?? p.y;
      p.vy = payload?.vy ?? p.vy;
      p.score = payload?.score ?? p.score;
      p.alive = payload?.alive ?? p.alive;
      socket.to(roomId).emit('state', {
        id: socket.id,
        y: p.y, vy: p.vy, score: p.score, alive: p.alive, t: payload?.t
      });
    });

    // Simple chat for debugging
    socket.on('msg', (text) => {
      socket.to(roomId).emit('msg', { from: socket.id, text: String(text || '').slice(0, 200) });
    });

    socket.on('disconnect', () => {
      const r = rooms.get(roomId);
      if (!r) return;
      r.players.delete(socket.id);
      socket.to(roomId).emit('playerLeft', { id: socket.id });
      if (r.players.size === 0) {
        rooms.delete(roomId);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
