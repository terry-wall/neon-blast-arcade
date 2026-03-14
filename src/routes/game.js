const express = require('express');
const router = express.Router();

// Game session management
let activeSessions = new Map();

// Create a new game session
router.post('/session', (req, res) => {
  const { playerId, playerName, gameMode } = req.body;
  
  if (!playerId || !playerName) {
    return res.status(400).json({ error: 'Player ID and name are required' });
  }
  
  const sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
  
  const session = {
    id: sessionId,
    playerId,
    playerName,
    gameMode: gameMode || 'single',
    score: 0,
    level: 1,
    lives: 3,
    status: 'active',
    startTime: new Date(),
    lastUpdate: new Date()
  };
  
  activeSessions.set(sessionId, session);
  
  res.json({
    success: true,
    sessionId,
    session
  });
});

// Update game session
router.put('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { score, level, lives, status } = req.body;
  
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Update session data
  if (score !== undefined) session.score = score;
  if (level !== undefined) session.level = level;
  if (lives !== undefined) session.lives = lives;
  if (status !== undefined) session.status = status;
  
  session.lastUpdate = new Date();
  
  res.json({
    success: true,
    session
  });
});

// Get game session
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    success: true,
    session
  });
});

// End game session
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  session.status = 'ended';
  session.endTime = new Date();
  
  // Remove from active sessions after a delay to allow final data retrieval
  setTimeout(() => {
    activeSessions.delete(sessionId);
  }, 60000); // 1 minute
  
  res.json({
    success: true,
    finalScore: session.score,
    finalLevel: session.level,
    duration: session.endTime - session.startTime
  });
});

// Get active sessions (for debugging/monitoring)
router.get('/sessions', (req, res) => {
  const sessions = Array.from(activeSessions.values()).map(session => ({
    id: session.id,
    playerName: session.playerName,
    gameMode: session.gameMode,
    score: session.score,
    level: session.level,
    status: session.status,
    startTime: session.startTime,
    lastUpdate: session.lastUpdate
  }));
  
  res.json({
    success: true,
    activeSessions: sessions.length,
    sessions
  });
});

// Game statistics
router.get('/stats', (req, res) => {
  const totalSessions = activeSessions.size;
  const activePlayers = Array.from(activeSessions.values())
    .filter(session => session.status === 'active').length;
  
  const scores = Array.from(activeSessions.values())
    .filter(session => session.score > 0)
    .map(session => session.score);
  
  const averageScore = scores.length > 0 ? 
    scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
  const highScore = scores.length > 0 ? Math.max(...scores) : 0;
  
  res.json({
    success: true,
    stats: {
      totalSessions,
      activePlayers,
      averageScore: Math.round(averageScore),
      highScore
    }
  });
});

// Clean up old sessions periodically
setInterval(() => {
  const now = new Date();
  const expireTime = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastUpdate > expireTime) {
      activeSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

module.exports = router;