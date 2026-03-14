const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'scores.db');

// Initialize database
class ScoresDatabase {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeDatabase();
      }
    });
  }
  
  initializeDatabase() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerName TEXT NOT NULL,
        score INTEGER NOT NULL,
        level INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(createTable, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Scores table ready');
        this.createIndexes();
      }
    });
  }
  
  createIndexes() {
    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_score ON scores(score DESC)',
      'CREATE INDEX IF NOT EXISTS idx_player ON scores(playerName)',
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON scores(timestamp DESC)'
    ];
    
    indexes.forEach(indexSQL => {
      this.db.run(indexSQL, (err) => {
        if (err) {
          console.error('Error creating index:', err);
        }
      });
    });
  }
  
  // Add a new score
  addScore(scoreData) {
    return new Promise((resolve, reject) => {
      const { playerName, score, level, timestamp } = scoreData;
      
      const sql = `
        INSERT INTO scores (playerName, score, level, timestamp)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [playerName, score, level, timestamp], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }
  
  // Get top scores
  getTopScores(limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT playerName, score, level, timestamp
        FROM scores
        ORDER BY score DESC, timestamp ASC
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Get player's best scores
  getPlayerScores(playerName, limit = 5) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT score, level, timestamp
        FROM scores
        WHERE playerName = ?
        ORDER BY score DESC, timestamp DESC
        LIMIT ?
      `;
      
      this.db.all(sql, [playerName, limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Get scores by time period
  getScoresByPeriod(startDate, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT playerName, score, level, timestamp
        FROM scores
        WHERE timestamp >= ?
        ORDER BY score DESC, timestamp ASC
        LIMIT ?
      `;
      
      this.db.all(sql, [startDate.toISOString(), limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  // Get leaderboard statistics
  getLeaderboardStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as totalScores,
          MAX(score) as highestScore,
          AVG(score) as averageScore,
          MAX(level) as highestLevel,
          COUNT(DISTINCT playerName) as uniquePlayers,
          MIN(timestamp) as oldestScore,
          MAX(timestamp) as newestScore
        FROM scores
      `;
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            totalScores: row.totalScores,
            highestScore: row.highestScore || 0,
            averageScore: Math.round(row.averageScore || 0),
            highestLevel: row.highestLevel || 0,
            uniquePlayers: row.uniquePlayers,
            oldestScore: row.oldestScore,
            newestScore: row.newestScore
          });
        }
      });
    });
  }
  
  // Delete a score
  deleteScore(scoreId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM scores WHERE id = ?';
      
      this.db.run(sql, [scoreId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }
  
  // Get player ranking
  getPlayerRanking(playerName) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) + 1 as rank
        FROM scores s1
        WHERE s1.score > (
          SELECT MAX(s2.score)
          FROM scores s2
          WHERE s2.playerName = ?
        )
      `;
      
      this.db.get(sql, [playerName], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.rank);
        }
      });
    });
  }
  
  // Clean up old scores (keep only top N scores)
  cleanupOldScores(keepTop = 1000) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM scores
        WHERE id NOT IN (
          SELECT id FROM scores
          ORDER BY score DESC, timestamp ASC
          LIMIT ?
        )
      `;
      
      this.db.run(sql, [keepTop], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }
  
  // Close database connection
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Create and export database instance
const scoresDatabase = new ScoresDatabase();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  scoresDatabase.close().then(() => {
    console.log('Database connection closed.');
    process.exit(0);
  }).catch((err) => {
    console.error('Error closing database:', err);
    process.exit(1);
  });
});

// Clean up old scores daily
setInterval(() => {
  scoresDatabase.cleanupOldScores(1000).then((deletedCount) => {
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old scores`);
    }
  }).catch((err) => {
    console.error('Error cleaning up scores:', err);
  });
}, 24 * 60 * 60 * 1000); // Once per day

module.exports = scoresDatabase;