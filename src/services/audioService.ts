
export class AudioManager {
  private static ctx: AudioContext | null = null;

  private static getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  static playCollect() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  static playHurt() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(55, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  static playSlide() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  static playLifeLost() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.setValueAtTime(165, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  static playPowerup() {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  private static musicNodes: (OscillatorNode | GainNode | AudioBufferSourceNode)[] = [];
  private static isMusicPlaying = false;
  private static loopTimeout: ReturnType<typeof setTimeout> | null = null;
  private static noiseBuffer: AudioBuffer | null = null;

  static startMusic() {
    if (this.isMusicPlaying) return;
    const ctx = this.getCtx();
    
    // Explicitly resume in case it's called outside a direct interaction
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (!this.noiseBuffer) {
      const bufferSize = ctx.sampleRate * 2;
      this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }

    this.isMusicPlaying = true;
    this.musicNodes = [];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.1, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.musicNodes.push(masterGain);

    // Bass synth
    const createBass = (freq: number, startTime: number) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq / 2, startTime);

      g.gain.setValueAtTime(0.12, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      
      osc.connect(g);
      osc2.connect(g);
      g.connect(masterGain);
      
      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 0.45);
      osc2.stop(startTime + 0.45);
    };

    // Percussion: Hi-hat
    const createHiHat = (startTime: number) => {
      if (!this.noiseBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, startTime);
      
      g.gain.setValueAtTime(0.03, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
      
      source.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      
      source.start(startTime);
      source.stop(startTime + 0.05);
    };

    // Percussion: Snare
    const createSnare = (startTime: number) => {
      if (!this.noiseBuffer) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, startTime);
      
      g.gain.setValueAtTime(0.08, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
      
      source.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      
      source.start(startTime);
      source.stop(startTime + 0.2);
    };

    // Lead synth
    const createLead = (freq: number, startTime: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(0.04, startTime);
      g.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    // Harmonic Pad
    const createPad = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(0.05, startTime + 0.5);
      g.gain.linearRampToValueAtTime(0.05, startTime + duration - 0.5);
      g.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    let beatCount = 0;
    const loop = () => {
      if (!this.isMusicPlaying) return;
      const now = ctx.currentTime;
      const beatLength = 0.25; 
      
      // Schedule 16 beats (4 bars)
      for (let i = 0; i < 16; i++) {
        const time = now + i * beatLength;
        const currentBeat = (beatCount + i) % 16;
        
        // Bass
        const bassNotes = [98, 98, 116.54, 130.81, 98, 98, 116.54, 123.47, 98, 98, 116.54, 130.81, 77.78, 77.78, 87.31, 73.42];
        if (currentBeat % 2 === 0) {
          createBass(bassNotes[Math.floor(currentBeat / 2) % bassNotes.length], time);
        }

        // Percussion
        createHiHat(time);
        if (currentBeat % 8 === 4) {
          createSnare(time);
        }

        // Pad every 16 beats
        if (currentBeat === 0) {
          const notes = [196, 233.08, 261.63]; // G3, Bb3, C4
          notes.forEach(f => createPad(f, time, 4.0));
        }

        // Melody
        const melody = [
          { beat: 0, f: 392 }, // G4
          { beat: 3, f: 466.16 }, // Bb4
          { beat: 6, f: 523.25 }, // C5
          { beat: 10, f: 349.23 }, // F4
          { beat: 14, f: 311.13 }, // Eb4
          { beat: 18, f: 440 }, // A4
          { beat: 22, f: 392 }, // G4
          { beat: 26, f: 587.33 }, // D5
          { beat: 30, f: 523.25 }, // C5
        ];
        
        const note = melody.find(m => m.beat === (beatCount + i) % 32);
        if (note) createLead(note.f, time);
      }
      
      beatCount += 16;
      this.loopTimeout = setTimeout(() => loop(), 3900); 
    };

    loop();
  }

  static stopMusic() {
    this.isMusicPlaying = false;
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.musicNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode) node.stop();
        if (node instanceof AudioBufferSourceNode) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.musicNodes = [];
  }
}
