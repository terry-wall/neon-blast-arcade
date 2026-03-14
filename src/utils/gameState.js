// Game State Management for Multiplayer
class GameStateManager {
  constructor() {
    this.players = new Map();
    this.bullets = [];
    this.enemies = [];
    this.gameSettings = {
      maxPlayers: 4,
      worldWidth: 800,
      worldHeight: 600,
      bulletSpeed: 8,
      enemySpawnRate: 120,
      maxEnemies: 15
    };
    this.lastEnemySpawn = 0;
    this.frameCount = 0;
  }
  
  // Add a new player
  addPlayer(socket, playerId, playerName) {
    if (this.players.size >= this.gameSettings.maxPlayers) {
      return false;
    }
    
    const player = {
      id: playerId,
      name: playerName,
      socket: socket,
      x: this.gameSettings.worldWidth / 2,
      y: this.gameSettings.worldHeight / 2,
      angle: 0,
      health: 100,
      score: 0,
      level: 1,
      energy: 100,
      lastShot: 0,
      isActive: true,
      joinTime: Date.now()
    };
    
    this.players.set(playerId, player);
    return true;
  }
  
  // Remove a player
  removePlayer(playerId) {
    return this.players.delete(playerId);
  }
  
  // Remove player by socket
  removePlayerBySocket(socket) {
    for (const [playerId, player] of this.players.entries()) {
      if (player.socket === socket) {
        this.players.delete(playerId);
        break;
      }
    }
  }
  
  // Update player position
  updatePlayer(playerId, position) {
    const player = this.players.get(playerId);
    if (player) {
      // Validate position to prevent cheating
      player.x = Math.max(0, Math.min(this.gameSettings.worldWidth, position.x));
      player.y = Math.max(0, Math.min(this.gameSettings.worldHeight, position.y));
      player.angle = position.angle;
    }
  }
  
  // Add a bullet
  addBullet(playerId, bulletData) {
    const player = this.players.get(playerId);
    if (!player) return;
    
    const now = Date.now();
    const shotCooldown = 100; // 100ms between shots
    
    if (now - player.lastShot < shotCooldown) {
      return; // Rate limiting
    }
    
    if (player.energy < 10) {
      return; // Not enough energy
    }
    
    const bullet = {
      id: 'bullet_' + Math.random().toString(36).substr(2, 9),
      playerId: playerId,
      x: player.x,
      y: player.y,
      vx: Math.cos(player.angle) * this.gameSettings.bulletSpeed,
      vy: Math.sin(player.angle) * this.gameSettings.bulletSpeed,
      damage: 20,
      lifeTime: 0,
      maxLifeTime: 180 // 3 seconds at 60 FPS
    };
    
    this.bullets.push(bullet);
    player.lastShot = now;
    player.energy -= 10;
  }
  
  // Update game state
  update() {
    this.frameCount++;
    
    this.updateBullets();
    this.updateEnemies();
    this.spawnEnemies();
    this.checkCollisions();
    this.updatePlayers();
  }
  
  // Update bullets
  updateBullets() {
    this.bullets = this.bullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.lifeTime++;
      
      // Remove bullets that are out of bounds or expired
      return bullet.x > 0 && bullet.x < this.gameSettings.worldWidth &&
             bullet.y > 0 && bullet.y < this.gameSettings.worldHeight &&
             bullet.lifeTime < bullet.maxLifeTime;
    });
  }
  
  // Update enemies
  updateEnemies() {
    this.enemies.forEach(enemy => {
      // Find nearest player
      let nearestPlayer = null;
      let nearestDistance = Infinity;
      
      for (const player of this.players.values()) {
        if (player.isActive) {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlayer = player;
          }
        }
      }
      
      // Move towards nearest player
      if (nearestPlayer && nearestDistance > 0) {
        const dx = nearestPlayer.x - enemy.x;
        const dy = nearestPlayer.y - enemy.y;
        const speed = 1.5;
        
        enemy.x += (dx / nearestDistance) * speed;
        enemy.y += (dy / nearestDistance) * speed;
      }
    });
  }
  
  // Spawn enemies
  spawnEnemies() {
    if (this.players.size === 0) return;
    
    const spawnRate = this.gameSettings.enemySpawnRate - (Math.floor(this.frameCount / 3600) * 10);
    
    if (this.frameCount - this.lastEnemySpawn > spawnRate) {
      if (this.enemies.length < this.gameSettings.maxEnemies) {
        this.spawnEnemy();
        this.lastEnemySpawn = this.frameCount;
      }
    }
  }
  
  // Spawn a single enemy
  spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
      case 0: // top
        x = Math.random() * this.gameSettings.worldWidth;
        y = -20;
        break;
      case 1: // right
        x = this.gameSettings.worldWidth + 20;
        y = Math.random() * this.gameSettings.worldHeight;
        break;
      case 2: // bottom
        x = Math.random() * this.gameSettings.worldWidth;
        y = this.gameSettings.worldHeight + 20;
        break;
      case 3: // left
        x = -20;
        y = Math.random() * this.gameSettings.worldHeight;
        break;
    }
    
    const enemy = {
      id: 'enemy_' + Math.random().toString(36).substr(2, 9),
      x: x,
      y: y,
      health: 50,
      maxHealth: 50,
      size: 15,
      type: 'basic',
      spawned: this.frameCount
    };
    
    this.enemies.push(enemy);
  }
  
  // Check collisions
  checkCollisions() {
    // Bullet-enemy collisions
    this.bullets = this.bullets.filter(bullet => {
      let bulletHit = false;
      
      this.enemies = this.enemies.filter(enemy => {
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.size + 5) { // 5 is bullet size
          const player = this.players.get(bullet.playerId);
          if (player) {
            player.score += 10;
            
            // Level up every 500 points
            if (player.score > 0 && player.score % 500 === 0) {
              player.level++;
            }
          }
          
          bulletHit = true;
          return false; // Remove enemy
        }
        
        return true; // Keep enemy
      });
      
      return !bulletHit; // Remove bullet if it hit
    });
    
    // Player-enemy collisions
    for (const player of this.players.values()) {
      if (!player.isActive) continue;
      
      this.enemies = this.enemies.filter(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < enemy.size + 20) { // 20 is player size
          player.health -= 25;
          
          if (player.health <= 0) {
            player.isActive = false;
            player.health = 0;
          }
          
          return false; // Remove enemy
        }
        
        return true; // Keep enemy
      });
    }
  }
  
  // Update players (regenerate energy, etc.)
  updatePlayers() {
    for (const player of this.players.values()) {
      // Regenerate energy
      if (player.energy < 100) {
        player.energy += 1;
        player.energy = Math.min(100, player.energy);
      }
      
      // Respawn inactive players after delay
      if (!player.isActive && player.health <= 0) {
        // Auto-respawn after 5 seconds
        if (Date.now() - player.lastDeath > 5000) {
          player.health = 100;
          player.isActive = true;
          player.x = this.gameSettings.worldWidth / 2;
          player.y = this.gameSettings.worldHeight / 2;
        }
      }
    }
  }
  
  // Get current game state for broadcasting
  getState() {
    const playersData = {};
    
    for (const [id, player] of this.players.entries()) {
      playersData[id] = {
        id: player.id,
        name: player.name,
        x: player.x,
        y: player.y,
        angle: player.angle,
        health: player.health,
        score: player.score,
        level: player.level,
        energy: player.energy,
        isActive: player.isActive
      };
    }
    
    return {
      players: playersData,
      bullets: this.bullets,
      enemies: this.enemies.map(enemy => ({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        health: enemy.health,
        size: enemy.size,
        type: enemy.type
      })),
      frameCount: this.frameCount
    };
  }
  
  // Get player count
  getPlayerCount() {
    return this.players.size;
  }
  
  // Clear all game data
  reset() {
    this.players.clear();
    this.bullets = [];
    this.enemies = [];
    this.frameCount = 0;
    this.lastEnemySpawn = 0;
  }
}

// Create and export game state manager instance
const gameState = new GameStateManager();

module.exports = gameState;