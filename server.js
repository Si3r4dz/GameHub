require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static(__dirname));

// --- In-memory game store ---
const games = new Map();

function generateId(len = 6) {
  return crypto.randomBytes(4).toString('hex').slice(0, len).toUpperCase();
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

// --- REST Endpoints ---

// Server info (LAN IP for QR code)
app.get('/api/server-info', (req, res) => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let ip = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address;
        break;
      }
    }
    if (ip !== 'localhost') break;
  }
  res.json({ ip, port: PORT });
});

// Create game
app.post('/api/games', (req, res) => {
  const gameId = generateId();
  const hostToken = generateToken();
  const game = {
    id: gameId,
    players: [],
    values: {},
    hostToken,
    hostSocketId: null,
    hostConnected: false,
    createdAt: new Date(),
  };
  games.set(gameId, game);
  res.json({ gameId, hostToken });
});

// Join game
app.post('/api/games/:gameId/join', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Gra nie istnieje' });

  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Podaj imię' });
  if (game.players.length >= 8) return res.status(400).json({ error: 'Maksymalnie 8 graczy' });

  const duplicate = game.players.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (duplicate) return res.status(400).json({ error: 'To imię jest już zajęte' });

  const playerToken = generateToken();
  const playerIndex = game.players.length;
  game.players.push({
    index: playerIndex,
    name,
    token: playerToken,
    socketId: null,
    connected: false,
  });

  // Notify host and other players
  io.to(game.id).emit('player:joined', { playerIndex, name });

  res.json({ playerIndex, playerToken, gameId: game.id });
});

// Get game state
app.get('/api/games/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Gra nie istnieje' });

  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Brak tokenu' });

  // Verify token belongs to this game
  const isHost = game.hostToken === token;
  const player = game.players.find(p => p.token === token);
  if (!isHost && !player) return res.status(403).json({ error: 'Nieprawidłowy token' });

  res.json({
    gameId: game.id,
    players: game.players.map(p => ({ index: p.index, name: p.name, connected: p.connected })),
    values: game.values,
    isHost,
    playerIndex: player ? player.index : null,
  });
});

// ElevenLabs signed URL (kept for future use)
app.get('/api/signed-url', async (req, res) => {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
    );
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }
    const data = await response.json();
    res.json({ signedUrl: data.signed_url });
  } catch (err) {
    console.error('Signed URL error:', err);
    res.status(500).json({ error: 'Failed to get signed URL' });
  }
});

// Serve index.html for /join/:gameId routes
app.get('/join/:gameId', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Socket.io ---
io.on('connection', (socket) => {

  socket.on('game:connect', ({ gameId, token }) => {
    const game = games.get(gameId);
    if (!game) return socket.emit('game:error', { error: 'Gra nie istnieje' });

    const isHost = game.hostToken === token;
    const player = game.players.find(p => p.token === token);

    if (!isHost && !player) {
      return socket.emit('game:error', { error: 'Nieprawidłowy token' });
    }

    socket.join(gameId);
    socket.data.gameId = gameId;
    socket.data.token = token;
    socket.data.isHost = isHost;
    socket.data.playerIndex = player ? player.index : null;

    if (isHost) {
      game.hostSocketId = socket.id;
      game.hostConnected = true;
    } else {
      player.socketId = socket.id;
      player.connected = true;
      io.to(gameId).emit('player:status', { playerIndex: player.index, connected: true });
    }

    // Send full state to connecting client
    socket.emit('game:state', {
      gameId: game.id,
      players: game.players.map(p => ({ index: p.index, name: p.name, connected: p.connected })),
      values: game.values,
      isHost,
      playerIndex: player ? player.index : null,
    });
  });

  socket.on('score:update', ({ gameId, category, playerIndex, value }) => {
    const game = games.get(gameId);
    if (!game) return;

    // Auth check: player can only edit own column, host can edit any
    const isHost = game.hostToken === socket.data.token;
    const player = game.players.find(p => p.token === socket.data.token);
    if (!isHost && (!player || player.index !== playerIndex)) return;

    // Update server state
    if (!game.values[category]) game.values[category] = {};
    game.values[category][playerIndex] = value;

    // Broadcast to all others in room
    socket.to(gameId).emit('score:changed', { category, playerIndex, value });
  });

  socket.on('game:reset', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;
    // Only host can reset
    if (game.hostToken !== socket.data.token) return;

    game.values = {};
    socket.to(gameId).emit('game:reset', {});
  });

  socket.on('game:remove-player', ({ gameId, playerIndex }) => {
    const game = games.get(gameId);
    if (!game) return;
    if (game.hostToken !== socket.data.token) return;

    const player = game.players[playerIndex];
    if (!player) return;

    // Disconnect player's socket if connected
    if (player.socketId) {
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) playerSocket.disconnect(true);
    }

    // Remove player and reindex
    game.players.splice(playerIndex, 1);
    game.players.forEach((p, i) => p.index = i);

    // Reindex values
    const newValues = {};
    for (const cat of Object.keys(game.values)) {
      newValues[cat] = {};
      for (const [idx, val] of Object.entries(game.values[cat])) {
        const oldIdx = parseInt(idx, 10);
        if (oldIdx < playerIndex) newValues[cat][oldIdx] = val;
        else if (oldIdx > playerIndex) newValues[cat][oldIdx - 1] = val;
        // oldIdx === playerIndex is removed
      }
    }
    game.values = newValues;

    // Broadcast full state refresh
    io.to(gameId).emit('game:state', {
      gameId: game.id,
      players: game.players.map(p => ({ index: p.index, name: p.name, connected: p.connected })),
      values: game.values,
      isHost: false,
      playerIndex: null,
    });
  });

  socket.on('disconnect', () => {
    const { gameId, token } = socket.data;
    if (!gameId) return;
    const game = games.get(gameId);
    if (!game) return;

    if (game.hostToken === token) {
      game.hostSocketId = null;
      game.hostConnected = false;
    } else {
      const player = game.players.find(p => p.token === token);
      if (player) {
        player.socketId = null;
        player.connected = false;
        io.to(gameId).emit('player:status', { playerIndex: player.index, connected: false });
      }
    }
  });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  console.log('Server running on:');
  console.log(`  http://localhost:${PORT}`);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  http://${net.address}:${PORT}`);
      }
    }
  }
});
