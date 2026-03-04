class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // 30% volume to avoid clipping/loudness
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(value: number, maxValue: number = 100) {
    if (!this.ctx || !this.masterGain) return;

    // Map value (1 - maxValue) to frequency (200Hz - 1200Hz)
    const minFreq = 200;
    const maxFreq = 1200;
    const frequency = minFreq + (value / maxValue) * (maxFreq - minFreq);

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    // Use a mix of sine and triangle for a pleasant, distinctive "bloop"
    osc.type = 'sine'; 
    
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.ctx.currentTime;
    
    // Envelope to prevent clicking
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.frequency.setValueAtTime(frequency, now);

    osc.start(now);
    osc.stop(now + 0.1);

    // Cleanup
    setTimeout(() => {
      osc.disconnect();
      gainNode.disconnect();
    }, 150);
  }
  
  stopAll() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
  }
}

export const audio = new AudioEngine();
