const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');

const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const gameState = require('./utils/gameState');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// WebSocket handling for real-time multiplayer
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'join':
          gameState.addPlayer(ws, message.playerId, message.playerName);
          break;
        case 'move':
          gameState.updatePlayer(message.playerId, message.position);
          break;
        case 'shoot':
          gameState.addBullet(message.playerId, message.bullet);
          break;
        case 'leave':
          gameState.removePlayer(message.playerId);
          break;
      }
      
      // Broadcast game state to all connected clients
      const gameStateData = gameState.getState();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'gameState',
            data: gameStateData
          }));
        }
      });
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    gameState.removePlayerBySocket(ws);
  });
});

// Serve the main game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Neon Blast Arcade server running on port ${PORT}`);
});

// Game loop for server-side updates
setInterval(() => {
  gameState.update();
}, 1000 / 60); // 60 FPS

module.exports = app;