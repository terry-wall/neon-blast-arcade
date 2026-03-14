// Sound Manager for Neon Blast Arcade
const SoundManager = {
  audioContext: null,
  sounds: {},
  musicGain: null,
  sfxGain: null,
  musicOscillator: null,
  isInitialized: false,
  
  // Initialize the audio context
  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();
      
      this.musicGain.connect(this.audioContext.destination);
      this.sfxGain.connect(this.audioContext.destination);
      
      // Set default volumes
      this.musicGain.gain.value = 0.3;
      this.sfxGain.gain.value = 0.5;
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('Audio not supported:', error);
    }
  },
  
  // Resume audio context if it's suspended (required by browsers)
  resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  },
  
  // Play a synthesized sound effect
  playTone(frequency, duration, waveType = 'square', volume = 0.1) {
    if (!this.audioContext) {
      this.init();
    }
    
    this.resumeContext();
    
    if (!this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.connect(gain);
      gain.connect(this.sfxGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to play tone:', error);
    }
  },
  
  // Play shooting sound
  playShoot() {
    // Quick high-pitched zap
    this.playTone(800, 0.1, 'square', 0.15);
    setTimeout(() => {
      this.playTone(600, 0.05, 'square', 0.1);
    }, 50);
  },
  
  // Play enemy hit sound
  playHit() {
    // Explosion-like sound
    this.playTone(200, 0.2, 'sawtooth', 0.2);
    setTimeout(() => {
      this.playTone(150, 0.15, 'square', 0.15);
    }, 100);
  },
  
  // Play damage sound
  playDamage() {
    // Low, ominous sound
    this.playTone(100, 0.3, 'triangle', 0.25);
    setTimeout(() => {
      this.playTone(80, 0.2, 'sawtooth', 0.2);
    }, 150);
  },
  
  // Play level up sound
  playLevelUp() {
    // Ascending celebratory tones
    const notes = [440, 523, 659, 784];
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note, 0.2, 'triangle', 0.2);
      }, index * 100);
    });
  },
  
  // Play game over sound
  playGameOver() {
    // Descending dramatic tones
    const notes = [440, 370, 311, 262];
    notes.forEach((note, index) => {
      setTimeout(() => {
        this.playTone(note, 0.4, 'sawtooth', 0.3);
      }, index * 300);
    });
  },
  
  // Play button click sound
  playClick() {
    this.playTone(600, 0.1, 'square', 0.1);
  },
  
  // Play background music (simple ambient loop)
  playMusic() {
    if (!this.audioContext || this.musicOscillator) {
      return;
    }
    
    this.init();
    this.resumeContext();
    
    if (!this.audioContext) return;
    
    try {
      // Create a simple ambient drone
      this.musicOscillator = this.audioContext.createOscillator();
      const musicGain = this.audioContext.createGain();
      
      this.musicOscillator.type = 'sine';
      this.musicOscillator.frequency.setValueAtTime(110, this.audioContext.currentTime); // Low A
      
      musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 2);
      
      this.musicOscillator.connect(musicGain);
      musicGain.connect(this.musicGain);
      
      this.musicOscillator.start();
      
      // Add some variation to the music
      this.addMusicVariation();
    } catch (error) {
      console.warn('Failed to start music:', error);
    }
  },
  
  // Add variations to the background music
  addMusicVariation() {
    if (!this.musicOscillator || !this.audioContext) return;
    
    // Gradually change frequency for ambient effect
    const baseFreq = 110;
    const variation = () => {
      if (this.musicOscillator) {
        const freq = baseFreq + Math.sin(this.audioContext.currentTime * 0.1) * 20;
        this.musicOscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        setTimeout(variation, 100);
      }
    };
    
    variation();
  },
  
  // Stop background music
  stopMusic() {
    if (this.musicOscillator) {
      try {
        this.musicOscillator.stop();
      } catch (error) {
        // Oscillator might already be stopped
      }
      this.musicOscillator = null;
    }
  },
  
  // Set music volume
  setMusicVolume(volume) {
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);
    }
  },
  
  // Set sound effects volume
  setSfxVolume(volume) {
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);
    }
  },
  
  // Play a sequence of notes (for special effects)
  playSequence(notes, noteLength = 0.2, waveType = 'square') {
    notes.forEach((frequency, index) => {
      setTimeout(() => {
        this.playTone(frequency, noteLength, waveType, 0.15);
      }, index * (noteLength * 1000));
    });
  },
  
  // Play power-up sound
  playPowerUp() {
    const powerUpNotes = [330, 392, 440, 523, 659];
    this.playSequence(powerUpNotes, 0.1, 'triangle');
  },
  
  // Play warning sound
  playWarning() {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(800, 0.1, 'square', 0.2);
        setTimeout(() => {
          this.playTone(400, 0.1, 'square', 0.2);
        }, 120);
      }, i * 400);
    }
  }
};

// Auto-initialize sound when user interacts with the page
document.addEventListener('click', () => {
  SoundManager.init();
}, { once: true });

document.addEventListener('keydown', () => {
  SoundManager.init();
}, { once: true });

document.addEventListener('touchstart', () => {
  SoundManager.init();
}, { once: true });

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoundManager;
}