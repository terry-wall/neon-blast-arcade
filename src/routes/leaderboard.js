const express = require('express');
const router = express.Router();
const scoresDatabase = require('../database/scores');

// Get leaderboard
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const scores = await scoresDatabase.getTopScores(limit);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Submit a new score
router.post('/', async (req, res) => {
  try {
    const { playerName, score, level } = req.body;
    
    // Validate input
    if (!playerName || typeof score !== 'number' || typeof level !== 'number') {
      return res.status(400).json({ error: 'Invalid score data' });
    }
    
    if (score < 0 || level < 1) {
      return res.status(400).json({ error: 'Invalid score or level' });
    }
    
    if (playerName.length > 20) {
      return res.status(400).json({ error: 'Player name too long' });
    }
    
    // Clean player name
    const cleanName = playerName.trim().replace(/[<>"'&]/g, '');
    
    if (cleanName.length === 0) {
      return res.status(400).json({ error: 'Invalid player name' });
    }
    
    const scoreId = await scoresDatabase.addScore({
      playerName: cleanName,
      score,
      level,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      scoreId,
      message: 'Score submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Get player's best score
router.get('/player/:playerName', async (req, res) => {
  try {
    const { playerName } = req.params;
    const scores = await scoresDatabase.getPlayerScores(playerName);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching player scores:', error);
    res.status(500).json({ error: 'Failed to fetch player scores' });
  }
});

// Get leaderboard for a specific time period
router.get('/period/:period', async (req, res) => {
  try {
    const { period } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }
    
    const scores = await scoresDatabase.getScoresByPeriod(startDate, limit);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching period leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch period leaderboard' });
  }
});

// Get leaderboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await scoresDatabase.getLeaderboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard statistics' });
  }
});

// Delete a score (admin function - could be protected with authentication)
router.delete('/:scoreId', async (req, res) => {
  try {
    const { scoreId } = req.params;
    const success = await scoresDatabase.deleteScore(scoreId);
    
    if (success) {
      res.json({ success: true, message: 'Score deleted successfully' });
    } else {
      res.status(404).json({ error: 'Score not found' });
    }
  } catch (error) {
    console.error('Error deleting score:', error);
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

module.exports = router;