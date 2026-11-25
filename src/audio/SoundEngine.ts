import { giftConfig } from '../config/giftConfig';

/**
 * Sound Engine
 * Synthesizes crisp micro-interaction SFX via Web Audio API
 * and plays the configured background music file.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGainNode: GainNode | null = null;
  private isMusicPlaying: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmUrl: string | undefined = undefined;

  constructor() {
    // AudioContext will be initialized on user interaction to comply with browser autoplay policies
  }

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master SFX Gain
      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.value = 0.5;
      this.sfxGainNode.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Sound Effects ---

  /** Soft musical chime on card entrance */
  public playChime() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 1.3);
    });
  }

  /** Soft warm thud / bounce when cake sponge drops */
  public playDropThud() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Cream landing squishy swoosh */
  public playCreamSwoosh() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  /** Candle tap */
  public playCandleTap() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Match strike & flame whoosh */
  public playIgnition() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    // Filtered noise for spark
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.value = 3;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);
    noise.start(now);

    // Warm chord swell
    const freqs = [329.63, 440.0, 554.37]; // E4, A4, C#5
    freqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.001, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(now + 0.08);
      osc.stop(now + 1.3);
    });
  }

  /** Candle blow out puff */
  public playBlowOut() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;

    // Breath / puff sound
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / bufferSize);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(250, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGainNode);
    noise.start(now);
  }

  /** Celebratory sparkle chime / fanfare */
  public playCelebrationChime() {
    if (!this.ctx || !this.sfxGainNode) return;
    const now = this.ctx.currentTime;
    // Ascending romantic arpeggio (Fmaj9 -> G -> C)
    const notes = [
      349.23, 440.00, 523.25, 659.25, // F4, A4, C5, E5
      392.00, 493.88, 587.33, 783.99, // G4, B4, D5, G5
      523.25, 659.25, 783.99, 1046.50 // C5, E5, G5, C6
    ];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.07;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.4);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);
      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  }

  // --- Background Music ---

  /** Play the configured background music file at the configured volume (default 50%) */
  public startBackgroundMusic(customUrl?: string) {
    if (this.isMusicPlaying) return;
    this.init();

    const musicUrl = customUrl ?? giftConfig.audio.backgroundMusicUrl;
    if (!musicUrl) return;

    this.isMusicPlaying = true;
    const targetVolume = Math.max(0, Math.min(1, giftConfig.audio.backgroundMusicVolume ?? 0.5));

    if (!this.bgmAudio || this.currentBgmUrl !== musicUrl) {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
      this.bgmAudio = new Audio(musicUrl);
      this.bgmAudio.loop = true;
      this.bgmAudio.preload = 'auto';
      this.currentBgmUrl = musicUrl;
    }

    this.bgmAudio.volume = targetVolume;
    this.bgmAudio.play().catch((err) => {
      console.warn('Background music failed to start:', err);
      this.isMusicPlaying = false;
    });
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.stopBackgroundMusic();
      return false;
    } else {
      this.startBackgroundMusic();
      return true;
    }
  }

  public isPlaying(): boolean {
    return this.isMusicPlaying;
  }
}

export const soundEngine = new SoundEngine();
