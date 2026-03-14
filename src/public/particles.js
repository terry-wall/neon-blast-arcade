// Particle System for Neon Blast Arcade
const ParticleSystem = {
  // Particle types
  TYPES: {
    EXPLOSION: 'explosion',
    DAMAGE: 'damage',
    TRAIL: 'trail',
    SPARK: 'spark'
  },
  
  // Create an explosion particle
  createExplosion(x, y) {
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1.0,
      decay: 0.02 + Math.random() * 0.02,
      size: 2 + Math.random() * 4,
      color: this.getRandomNeonColor(),
      type: this.TYPES.EXPLOSION,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2
    };
  },
  
  // Create a damage particle
  createDamage(x, y) {
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 1.0,
      decay: 0.03 + Math.random() * 0.03,
      size: 1 + Math.random() * 3,
      color: '#FF2D7C',
      type: this.TYPES.DAMAGE,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3
    };
  },
  
  // Create a trail particle
  createTrail(x, y, angle) {
    return {
      x: x,
      y: y,
      vx: Math.cos(angle + (Math.random() - 0.5) * 0.5) * -2,
      vy: Math.sin(angle + (Math.random() - 0.5) * 0.5) * -2,
      life: 0.8,
      decay: 0.05,
      size: 1 + Math.random() * 2,
      color: '#00F0FF',
      type: this.TYPES.TRAIL,
      rotation: 0,
      rotationSpeed: 0
    };
  },
  
  // Create a spark particle
  createSpark(x, y) {
    return {
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 0.6,
      decay: 0.04,
      size: 0.5 + Math.random() * 1.5,
      color: '#EEFF00',
      type: this.TYPES.SPARK,
      rotation: 0,
      rotationSpeed: 0
    };
  },
  
  // Get a random neon color
  getRandomNeonColor() {
    const colors = ['#EEFF00', '#FF2D7C', '#00F0FF', '#39FF14', '#FF6B35'];
    return colors[Math.floor(Math.random() * colors.length)];
  },
  
  // Update a particle
  update(particle) {
    // Update position
    particle.x += particle.vx;
    particle.y += particle.vy;
    
    // Update rotation
    particle.rotation += particle.rotationSpeed;
    
    // Apply friction based on particle type
    switch (particle.type) {
      case this.TYPES.EXPLOSION:
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        break;
      case this.TYPES.DAMAGE:
        particle.vx *= 0.96;
        particle.vy *= 0.96;
        break;
      case this.TYPES.TRAIL:
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        break;
      case this.TYPES.SPARK:
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        break;
    }
    
    // Update life
    particle.life -= particle.decay;
    
    // Return true if particle should continue to exist
    return particle.life > 0;
  },
  
  // Render a particle
  render(ctx, particle) {
    if (particle.life <= 0) return;
    
    ctx.save();
    
    // Set alpha based on life
    ctx.globalAlpha = particle.life;
    
    // Set glow effect
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.size * 2;
    
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    
    // Render based on particle type
    switch (particle.type) {
      case this.TYPES.EXPLOSION:
        this.renderExplosion(ctx, particle);
        break;
      case this.TYPES.DAMAGE:
        this.renderDamage(ctx, particle);
        break;
      case this.TYPES.TRAIL:
        this.renderTrail(ctx, particle);
        break;
      case this.TYPES.SPARK:
        this.renderSpark(ctx, particle);
        break;
    }
    
    ctx.restore();
  },
  
  // Render explosion particle
  renderExplosion(ctx, particle) {
    ctx.fillStyle = particle.color;
    
    // Draw a cross shape
    ctx.fillRect(-particle.size/2, -particle.size/8, particle.size, particle.size/4);
    ctx.fillRect(-particle.size/8, -particle.size/2, particle.size/4, particle.size);
  },
  
  // Render damage particle
  renderDamage(ctx, particle) {
    ctx.fillStyle = particle.color;
    
    // Draw a diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -particle.size);
    ctx.lineTo(particle.size, 0);
    ctx.lineTo(0, particle.size);
    ctx.lineTo(-particle.size, 0);
    ctx.closePath();
    ctx.fill();
  },
  
  // Render trail particle
  renderTrail(ctx, particle) {
    ctx.fillStyle = particle.color;
    
    // Draw a small circle
    ctx.beginPath();
    ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
    ctx.fill();
  },
  
  // Render spark particle
  renderSpark(ctx, particle) {
    ctx.fillStyle = particle.color;
    
    // Draw a small square
    ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
  },
  
  // Create a burst of particles
  createBurst(x, y, count, type) {
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      switch (type) {
        case this.TYPES.EXPLOSION:
          particles.push(this.createExplosion(x, y));
          break;
        case this.TYPES.DAMAGE:
          particles.push(this.createDamage(x, y));
          break;
        case this.TYPES.SPARK:
          particles.push(this.createSpark(x, y));
          break;
      }
    }
    
    return particles;
  },
  
  // Create engine trail particles for moving objects
  createEngineTrail(x, y, angle, count = 3) {
    const particles = [];
    
    for (let i = 0; i < count; i++) {
      particles.push(this.createTrail(x, y, angle));
    }
    
    return particles;
  },
  
  // Create screen edge sparks
  createScreenSparks(x, y, count = 5) {
    return this.createBurst(x, y, count, this.TYPES.SPARK);
  },
  
  // Create level up celebration particles
  createLevelUpParticles(x, y) {
    const particles = [];
    
    // Create a ring of explosion particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      
      particles.push(this.createExplosion(px, py));
    }
    
    // Add some sparks
    for (let i = 0; i < 20; i++) {
      particles.push(this.createSpark(x, y));
    }
    
    return particles;
  },
  
  // Create muzzle flash particles
  createMuzzleFlash(x, y, angle) {
    const particles = [];
    
    // Create sparks in the firing direction
    for (let i = 0; i < 5; i++) {
      const particle = this.createSpark(x, y);
      const spread = 0.3;
      particle.vx = Math.cos(angle + (Math.random() - 0.5) * spread) * (3 + Math.random() * 2);
      particle.vy = Math.sin(angle + (Math.random() - 0.5) * spread) * (3 + Math.random() * 2);
      particles.push(particle);
    }
    
    return particles;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ParticleSystem;
}