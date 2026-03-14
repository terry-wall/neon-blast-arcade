// Game constants
const GAME_CONFIG = {
  canvas: {
    width: 800,
    height: 600
  },
  player: {
    size: 20,
    speed: 5,
    maxEnergy: 100,
    energyRecharge: 1
  },
  bullet: {
    size: 4,
    speed: 8,
    energyCost: 10
  },
  enemy: {
    size: 15,
    speed: 2,
    spawnRate: 120, // frames
    maxCount: 10
  }
};

// Game state
const gameState = {
  screen: 'start', // start, multiplayer, game, gameOver, leaderboard
  mode: 'single', // single, multi
  score: 0,
  lives: 3,
  level: 1,
  energy: 100,
  player: {
    x: 400,
    y: 300,
    angle: 0
  },
  bullets: [],
  enemies: [],
  particles: [],
  keys: {},
  mouse: { x: 0, y: 0, pressed: false },
  lastEnemySpawn: 0,
  frameCount: 0,
  multiplayer: {
    connected: false,
    playerId: null,
    playerName: '',
    otherPlayers: {}
  }
};

// Canvas and context
let canvas, ctx;
let ws; // WebSocket for multiplayer

// Mobile controls
let joystick = {
  active: false,
  centerX: 0,
  centerY: 0,
  knobX: 0,
  knobY: 0,
  deltaX: 0,
  deltaY: 0
};

// Initialize the game
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  canvas.width = GAME_CONFIG.canvas.width;
  canvas.height = GAME_CONFIG.canvas.height;
  
  setupEventListeners();
  setupMobileControls();
  
  // Start the game loop
  gameLoop();
}

function setupEventListeners() {
  // Keyboard events
  document.addEventListener('keydown', (e) => {
    gameState.keys[e.code] = true;
    
    if (e.code === 'Space' && gameState.screen === 'game') {
      e.preventDefault();
      shoot();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    gameState.keys[e.code] = false;
  });
  
  // Mouse events
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
  });
  
  canvas.addEventListener('mousedown', (e) => {
    gameState.mouse.pressed = true;
    if (gameState.screen === 'game') {
      shoot();
    }
  });
  
  canvas.addEventListener('mouseup', (e) => {
    gameState.mouse.pressed = false;
  });
  
  // Button events
  document.getElementById('singlePlayerBtn').addEventListener('click', startSinglePlayer);
  document.getElementById('multiPlayerBtn').addEventListener('click', showMultiplayerSetup);
  document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
  document.getElementById('joinGameBtn').addEventListener('click', startMultiplayer);
  document.getElementById('backToMenuBtn').addEventListener('click', showStartScreen);
  document.getElementById('submitScoreBtn').addEventListener('click', submitScore);
  document.getElementById('playAgainBtn').addEventListener('click', playAgain);
  document.getElementById('mainMenuBtn').addEventListener('click', showStartScreen);
  document.getElementById('backFromLeaderboardBtn').addEventListener('click', showStartScreen);
}

function setupMobileControls() {
  const joystickOuter = document.getElementById('joystickOuter');
  const joystickInner = document.getElementById('joystickInner');
  const shootButton = document.getElementById('shootButton');
  
  // Joystick events
  joystickOuter.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystick.active = true;
    const rect = joystickOuter.getBoundingClientRect();
    joystick.centerX = rect.left + rect.width / 2;
    joystick.centerY = rect.top + rect.height / 2;
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!joystick.active) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - joystick.centerX;
    const deltaY = touch.clientY - joystick.centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 25;
    
    if (distance <= maxDistance) {
      joystick.knobX = deltaX;
      joystick.knobY = deltaY;
    } else {
      joystick.knobX = (deltaX / distance) * maxDistance;
      joystick.knobY = (deltaY / distance) * maxDistance;
    }
    
    joystick.deltaX = joystick.knobX / maxDistance;
    joystick.deltaY = joystick.knobY / maxDistance;
    
    joystickInner.style.transform = `translate(${joystick.knobX}px, ${joystick.knobY}px)`;
  });
  
  document.addEventListener('touchend', (e) => {
    if (joystick.active) {
      joystick.active = false;
      joystick.deltaX = 0;
      joystick.deltaY = 0;
      joystickInner.style.transform = 'translate(0, 0)';
    }
  });
  
  // Shoot button
  shootButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.screen === 'game') {
      shoot();
    }
  });
}

// Screen management functions
function showScreen(screenName) {
  const screens = ['startScreen', 'multiplayerScreen', 'gameOverScreen', 'leaderboardScreen'];
  const elements = ['gameCanvas', 'hud', 'mobileControls'];
  
  screens.forEach(screen => {
    document.getElementById(screen).classList.add('hidden');
  });
  
  elements.forEach(element => {
    document.getElementById(element).classList.add('hidden');
  });
  
  if (screenName === 'game') {
    document.getElementById('gameCanvas').classList.remove('hidden');
    document.getElementById('hud').classList.remove('hidden');
    if (window.innerWidth <= 768) {
      document.getElementById('mobileControls').classList.remove('hidden');
    }
  } else {
    document.getElementById(screenName).classList.remove('hidden');
  }
}

function showStartScreen() {
  gameState.screen = 'start';
  showScreen('startScreen');
  if (ws) {
    ws.close();
  }
}

function showMultiplayerSetup() {
  gameState.screen = 'multiplayer';
  showScreen('multiplayerScreen');
}

function startSinglePlayer() {
  gameState.mode = 'single';
  gameState.screen = 'game';
  resetGame();
  showScreen('game');
  SoundManager.playMusic();
}

function startMultiplayer() {
  const playerName = document.getElementById('playerName').value.trim();
  if (!playerName) {
    alert('Please enter a player name');
    return;
  }
  
  gameState.mode = 'multi';
  gameState.multiplayer.playerName = playerName;
  gameState.multiplayer.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
  
  connectToServer();
}

function connectToServer() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    gameState.multiplayer.connected = true;
    ws.send(JSON.stringify({
      type: 'join',
      playerId: gameState.multiplayer.playerId,
      playerName: gameState.multiplayer.playerName
    }));
    
    gameState.screen = 'game';
    resetGame();
    showScreen('game');
    SoundManager.playMusic();
  };
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'gameState') {
      handleMultiplayerUpdate(message.data);
    }
  };
  
  ws.onclose = () => {
    gameState.multiplayer.connected = false;
    if (gameState.screen === 'game') {
      showGameOver();
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    alert('Failed to connect to multiplayer server');
    showStartScreen();
  };
}

function handleMultiplayerUpdate(data) {
  gameState.multiplayer.otherPlayers = data.players || {};
  document.getElementById('multiplayerInfo').textContent = `Players: ${Object.keys(data.players || {}).length}`;
}

function showLeaderboard() {
  gameState.screen = 'leaderboard';
  showScreen('leaderboardScreen');
  loadLeaderboard();
}

function showGameOver() {
  gameState.screen = 'gameOver';
  showScreen('gameOverScreen');
  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('finalLevel').textContent = gameState.level;
  SoundManager.stopMusic();
  SoundManager.playGameOver();
}

// Game logic functions
function resetGame() {
  gameState.score = 0;
  gameState.lives = 3;
  gameState.level = 1;
  gameState.energy = 100;
  gameState.player.x = GAME_CONFIG.canvas.width / 2;
  gameState.player.y = GAME_CONFIG.canvas.height / 2;
  gameState.bullets = [];
  gameState.enemies = [];
  gameState.particles = [];
  gameState.lastEnemySpawn = 0;
  gameState.frameCount = 0;
  
  updateHUD();
}

function updateGame() {
  if (gameState.screen !== 'game') return;
  
  gameState.frameCount++;
  
  handleInput();
  updatePlayer();
  updateBullets();
  updateEnemies();
  updateParticles();
  checkCollisions();
  spawnEnemies();
  updateEnergy();
  updateHUD();
  
  if (gameState.mode === 'multi' && gameState.multiplayer.connected) {
    sendMultiplayerUpdate();
  }
}

function handleInput() {
  let deltaX = 0;
  let deltaY = 0;
  
  // Keyboard input
  if (gameState.keys['KeyW'] || gameState.keys['ArrowUp']) deltaY -= 1;
  if (gameState.keys['KeyS'] || gameState.keys['ArrowDown']) deltaY += 1;
  if (gameState.keys['KeyA'] || gameState.keys['ArrowLeft']) deltaX -= 1;
  if (gameState.keys['KeyD'] || gameState.keys['ArrowRight']) deltaX += 1;
  
  // Mobile joystick input
  if (joystick.active) {
    deltaX += joystick.deltaX;
    deltaY += joystick.deltaY;
  }
  
  // Normalize diagonal movement
  if (deltaX !== 0 && deltaY !== 0) {
    deltaX *= 0.7;
    deltaY *= 0.7;
  }
  
  gameState.player.x += deltaX * GAME_CONFIG.player.speed;
  gameState.player.y += deltaY * GAME_CONFIG.player.speed;
  
  // Keep player in bounds
  gameState.player.x = Math.max(GAME_CONFIG.player.size, Math.min(GAME_CONFIG.canvas.width - GAME_CONFIG.player.size, gameState.player.x));
  gameState.player.y = Math.max(GAME_CONFIG.player.size, Math.min(GAME_CONFIG.canvas.height - GAME_CONFIG.player.size, gameState.player.y));
  
  // Update player angle based on mouse position
  gameState.player.angle = Math.atan2(
    gameState.mouse.y - gameState.player.y,
    gameState.mouse.x - gameState.player.x
  );
}

function updatePlayer() {
  // Player logic is handled in handleInput
}

function updateBullets() {
  gameState.bullets = gameState.bullets.filter(bullet => {
    bullet.x += Math.cos(bullet.angle) * GAME_CONFIG.bullet.speed;
    bullet.y += Math.sin(bullet.angle) * GAME_CONFIG.bullet.speed;
    
    // Remove bullets that go off screen
    return bullet.x > 0 && bullet.x < GAME_CONFIG.canvas.width &&
           bullet.y > 0 && bullet.y < GAME_CONFIG.canvas.height;
  });
}

function updateEnemies() {
  gameState.enemies.forEach(enemy => {
    const dx = gameState.player.x - enemy.x;
    const dy = gameState.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      enemy.x += (dx / distance) * GAME_CONFIG.enemy.speed;
      enemy.y += (dy / distance) * GAME_CONFIG.enemy.speed;
    }
  });
}

function updateParticles() {
  gameState.particles = gameState.particles.filter(particle => {
    return ParticleSystem.update(particle);
  });
}

function spawnEnemies() {
  if (gameState.frameCount - gameState.lastEnemySpawn > GAME_CONFIG.enemy.spawnRate - (gameState.level * 10)) {
    if (gameState.enemies.length < GAME_CONFIG.enemy.maxCount + gameState.level) {
      spawnEnemy();
      gameState.lastEnemySpawn = gameState.frameCount;
    }
  }
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  
  switch (side) {
    case 0: // top
      x = Math.random() * GAME_CONFIG.canvas.width;
      y = -GAME_CONFIG.enemy.size;
      break;
    case 1: // right
      x = GAME_CONFIG.canvas.width + GAME_CONFIG.enemy.size;
      y = Math.random() * GAME_CONFIG.canvas.height;
      break;
    case 2: // bottom
      x = Math.random() * GAME_CONFIG.canvas.width;
      y = GAME_CONFIG.canvas.height + GAME_CONFIG.enemy.size;
      break;
    case 3: // left
      x = -GAME_CONFIG.enemy.size;
      y = Math.random() * GAME_CONFIG.canvas.height;
      break;
  }
  
  gameState.enemies.push({
    x: x,
    y: y,
    size: GAME_CONFIG.enemy.size,
    health: 1
  });
}

function shoot() {
  if (gameState.energy >= GAME_CONFIG.bullet.energyCost) {
    gameState.bullets.push({
      x: gameState.player.x,
      y: gameState.player.y,
      angle: gameState.player.angle,
      size: GAME_CONFIG.bullet.size
    });
    
    gameState.energy -= GAME_CONFIG.bullet.energyCost;
    SoundManager.playShoot();
  }
}

function checkCollisions() {
  // Bullet-enemy collisions
  gameState.bullets = gameState.bullets.filter(bullet => {
    let bulletHit = false;
    
    gameState.enemies = gameState.enemies.filter(enemy => {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < bullet.size + enemy.size) {
        bulletHit = true;
        gameState.score += 10;
        
        // Create explosion particles
        for (let i = 0; i < 8; i++) {
          gameState.particles.push(ParticleSystem.createExplosion(enemy.x, enemy.y));
        }
        
        SoundManager.playHit();
        
        // Check for level up
        if (gameState.score > 0 && gameState.score % 500 === 0) {
          gameState.level++;
          SoundManager.playLevelUp();
        }
        
        return false; // Remove enemy
      }
      
      return true; // Keep enemy
    });
    
    return !bulletHit; // Remove bullet if it hit
  });
  
  // Player-enemy collisions
  gameState.enemies = gameState.enemies.filter(enemy => {
    const dx = gameState.player.x - enemy.x;
    const dy = gameState.player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < GAME_CONFIG.player.size + enemy.size) {
      gameState.lives--;
      
      // Create damage particles
      for (let i = 0; i < 12; i++) {
        gameState.particles.push(ParticleSystem.createDamage(gameState.player.x, gameState.player.y));
      }
      
      SoundManager.playDamage();
      
      if (gameState.lives <= 0) {
        showGameOver();
      }
      
      return false; // Remove enemy
    }
    
    return true; // Keep enemy
  });
}

function updateEnergy() {
  if (gameState.energy < GAME_CONFIG.player.maxEnergy) {
    gameState.energy += GAME_CONFIG.player.energyRecharge;
    gameState.energy = Math.min(gameState.energy, GAME_CONFIG.player.maxEnergy);
  }
}

function updateHUD() {
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('level').textContent = gameState.level;
  
  const energyPercent = (gameState.energy / GAME_CONFIG.player.maxEnergy) * 100;
  document.getElementById('energyFill').style.width = energyPercent + '%';
}

function sendMultiplayerUpdate() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'move',
      playerId: gameState.multiplayer.playerId,
      position: {
        x: gameState.player.x,
        y: gameState.player.y,
        angle: gameState.player.angle
      }
    }));
  }
}

// Rendering functions
function render() {
  ctx.fillStyle = 'rgba(13, 5, 24, 0.1)';
  ctx.fillRect(0, 0, GAME_CONFIG.canvas.width, GAME_CONFIG.canvas.height);
  
  if (gameState.screen === 'game') {
    renderPlayer();
    renderBullets();
    renderEnemies();
    renderParticles();
    renderMultiplayerPlayers();
  }
}

function renderPlayer() {
  ctx.save();
  ctx.translate(gameState.player.x, gameState.player.y);
  ctx.rotate(gameState.player.angle);
  
  // Player body
  ctx.fillStyle = '#00F0FF';
  ctx.shadowColor = '#00F0FF';
  ctx.shadowBlur = 10;
  ctx.fillRect(-GAME_CONFIG.player.size/2, -GAME_CONFIG.player.size/2, GAME_CONFIG.player.size, GAME_CONFIG.player.size);
  
  // Player direction indicator
  ctx.fillStyle = '#EEFF00';
  ctx.fillRect(GAME_CONFIG.player.size/2, -2, 8, 4);
  
  ctx.restore();
}

function renderBullets() {
  ctx.fillStyle = '#EEFF00';
  ctx.shadowColor = '#EEFF00';
  ctx.shadowBlur = 5;
  
  gameState.bullets.forEach(bullet => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderEnemies() {
  ctx.fillStyle = '#FF2D7C';
  ctx.shadowColor = '#FF2D7C';
  ctx.shadowBlur = 8;
  
  gameState.enemies.forEach(enemy => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderParticles() {
  gameState.particles.forEach(particle => {
    ParticleSystem.render(ctx, particle);
  });
}

function renderMultiplayerPlayers() {
  if (gameState.mode !== 'multi') return;
  
  Object.values(gameState.multiplayer.otherPlayers).forEach(player => {
    if (player.id !== gameState.multiplayer.playerId) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      
      ctx.fillStyle = '#39FF14';
      ctx.shadowColor = '#39FF14';
      ctx.shadowBlur = 10;
      ctx.fillRect(-GAME_CONFIG.player.size/2, -GAME_CONFIG.player.size/2, GAME_CONFIG.player.size, GAME_CONFIG.player.size);
      
      ctx.restore();
    }
  });
}

// API functions
async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    const scores = await response.json();
    
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    scores.forEach((score, index) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      item.innerHTML = `
        <span>${index + 1}. ${score.playerName}</span>
        <span>${score.score}</span>
      `;
      leaderboardList.appendChild(item);
    });
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
  }
}

async function submitScore() {
  const playerName = document.getElementById('scorePlayerName').value.trim() || 'Anonymous';
  
  try {
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerName: playerName,
        score: gameState.score,
        level: gameState.level
      })
    });
    
    document.getElementById('nameInputGroup').style.display = 'none';
    document.getElementById('submitScoreBtn').style.display = 'none';
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
}

function playAgain() {
  if (gameState.mode === 'single') {
    startSinglePlayer();
  } else {
    showMultiplayerSetup();
  }
}

// Game loop
function gameLoop() {
  updateGame();
  render();
  requestAnimationFrame(gameLoop);
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', init);