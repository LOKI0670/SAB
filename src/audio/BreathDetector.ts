/**
 * Interactive Microphone & Headphone Breath Blower Detector
 *
 * Uses peak + RMS dBFS envelope tracking, a rolling calm-frame noise floor,
 * automatic AudioContext recovery, and explicit audioinput device selection so it works
 * across laptop mics, smartphones, wired headsets, and Bluetooth earbuds/headphones.
 */

export type BreathDetectorState =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'denied'
  | 'unsupported'
  | 'blown';

export type BreathSensitivity = 'high' | 'normal';

export interface AudioInputDeviceInfo {
  deviceId: string;
  label: string;
}

export interface BreathDetectorCallbacks {
  onStateChange?: (state: BreathDetectorState, message?: string) => void;
  onDevicesUpdated?: (devices: AudioInputDeviceInfo[], activeDeviceId: string | undefined) => void;
  onMicLevel?: (level: number, peakDb: number) => void;
  onBreath?: (intensity: number, progress: number) => void;
  onBlowOut?: () => void;
}

export class BreathDetector {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private silentGain: GainNode | null = null;

  private state: BreathDetectorState = 'idle';
  private callbacks: BreathDetectorCallbacks;
  private sensitivity: BreathSensitivity = 'high';

  private animFrameId: number | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private floatTimeData: Float32Array<ArrayBuffer> | null = null;

  // Device management
  private availableDevices: AudioInputDeviceInfo[] = [];
  private currentDeviceId: string | undefined = undefined;

  // Active gate: only triggers blowout when candle is lit and ready
  private isEnabled: boolean = false;

  // Rolling calm-frame noise floor tracking (dBFS)
  private noiseFloorDb: number = -58.0;
  private calibrationFrames: number = 0;
  private silentFrames: number = 0;
  private hasWarnedSilence: boolean = false;
  private hasRetriedGraph: boolean = false;
  private smoothedIntensity: number = 0.0;
  private blowProgress: number = 0.0;
  private lastTimestamp: number = 0;

  constructor(callbacks: BreathDetectorCallbacks = {}) {
    this.callbacks = callbacks;

    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.refreshDevices();
      });
    }
  }

  public getState(): BreathDetectorState {
    return this.state;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public getSensitivity(): BreathSensitivity {
    return this.sensitivity;
  }

  public setSensitivity(mode: BreathSensitivity) {
    this.sensitivity = mode;
  }

  /**
   * Request microphone access on a user gesture (e.g. entrance button or mic toggle click).
   */
  public async start(deviceId?: string): Promise<boolean> {
    if (!window.isSecureContext) {
      this.setState('unsupported', 'Mic needs localhost or HTTPS • Tap candle to blow');
      return false;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setState('unsupported', 'Mic not supported • Tap candle to blow');
      return false;
    }

    // Create & resume AudioContext synchronously inside user gesture
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    // If switching devices, clean up existing stream first
    if (deviceId && deviceId !== this.currentDeviceId) {
      this.stopStream();
    }

    if (this.mediaStream && this.mediaStream.active) {
      if (!this.animFrameId) {
        this.startLoop();
      }
      if (this.state !== 'listening') {
        this.setState('listening', 'Blow into your mic or headphones 🌬️');
      }
      return true;
    }

    this.setState('requesting', 'Allow microphone access to blow...');

    try {
      let stream: MediaStream;
      const baseDevice = deviceId ? { deviceId: { exact: deviceId } } : {};

      try {
        // Keep autoGainControl + echoCancellation (helps subtract speaker BGM)
        // while turning off noiseSuppression so wind/breath isn't filtered out.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...baseDevice,
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true
          }
        });
      } catch {
        // Fallback to simplest standard browser audio request (best compatibility for headsets/Bluetooth)
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { ideal: deviceId } } : true
        });
      }

      this.mediaStream = stream;
      const activeTrack = stream.getAudioTracks()[0];
      if (activeTrack) {
        activeTrack.enabled = true;
        this.currentDeviceId = activeTrack.getSettings().deviceId;
      }

      await this.refreshDevices();
      await this.setupAudioGraph(stream);

      this.lastTimestamp = performance.now();
      this.blowProgress = 0;
      this.smoothedIntensity = 0;
      this.noiseFloorDb = -58.0;
      this.calibrationFrames = 0;
      this.silentFrames = 0;
      this.hasWarnedSilence = false;
      this.hasRetriedGraph = false;

      this.setState('listening', 'Blow into your mic or headphones 🌬️');
      this.startLoop();
      return true;
    } catch (err) {
      const errorName = err instanceof DOMException ? err.name : '';
      console.warn('Microphone access failed:', err);

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        this.setState('denied', 'Mic blocked • Allow in address bar or tap to blow');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.setState('unsupported', 'No mic detected • Tap candle to blow');
      } else {
        this.setState('denied', 'Mic unavailable • Tap candle or button to blow');
      }
      return false;
    }
  }

  private async setupAudioGraph(stream: MediaStream) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
    }

    this.sourceNode = this.audioCtx.createMediaStreamSource(stream);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.2;

    this.silentGain = this.audioCtx.createGain();
    this.silentGain.gain.value = 0;

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.silentGain);
    this.silentGain.connect(this.audioCtx.destination);

    const freqBuffer = new ArrayBuffer(this.analyser.frequencyBinCount);
    this.freqData = new Uint8Array(freqBuffer);

    const timeBuffer = new ArrayBuffer(this.analyser.fftSize * Float32Array.BYTES_PER_ELEMENT);
    this.floatTimeData = new Float32Array(timeBuffer);
  }

  public async selectDevice(deviceId: string): Promise<boolean> {
    const wasEnabled = this.isEnabled;
    this.stopStream();
    const ok = await this.start(deviceId);
    if (ok && wasEnabled) {
      this.enableDetection();
    }
    return ok;
  }

  private async refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices
        .filter((d) => d.kind === 'audioinput' && d.deviceId !== '')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${idx + 1}`
        }));

      this.availableDevices = inputs;
      this.callbacks.onDevicesUpdated?.(this.availableDevices, this.currentDeviceId);
    } catch {
      // Ignore enumerateDevices errors
    }
  }

  /**
   * Enable blow detection once the candle flame is ignited and assembly is complete.
   */
  public enableDetection() {
    this.isEnabled = true;
    this.blowProgress = 0;
    this.smoothedIntensity = 0;
    this.lastTimestamp = performance.now();

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (this.mediaStream && this.mediaStream.active) {
      this.setState('listening', 'Blow into your mic or headphones 🌬️');
      if (!this.animFrameId) {
        this.startLoop();
      }
    }
  }

  /**
   * Disable blowout triggers (e.g. during cake drop animation or after candle is blown).
   */
  public disableDetection() {
    this.isEnabled = false;
    this.blowProgress = 0;
    this.smoothedIntensity = 0;
    if (this.callbacks.onBreath) {
      this.callbacks.onBreath(0, 0);
    }
  }

  private startLoop() {
    if (this.animFrameId !== null) return;

    const analyze = () => {
      if (!this.analyser || !this.freqData || !this.floatTimeData) {
        this.animFrameId = null;
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - this.lastTimestamp) / 1000));
      this.lastTimestamp = now;

      // Ensure AudioContext hasn't been suspended by browser/OS
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // 1. Read 32-bit float waveform and FFT spectrum
      this.analyser.getFloatTimeDomainData(this.floatTimeData);
      this.analyser.getByteFrequencyData(this.freqData);

      // Compute both RMS and Peak amplitude (catching sharp breath pressure pops!)
      let sumSquares = 0;
      let maxAbs = 0;
      const len = this.floatTimeData.length;
      for (let i = 0; i < len; i++) {
        const s = this.floatTimeData[i];
        const a = s < 0 ? -s : s;
        if (a > maxAbs) maxAbs = a;
        sumSquares += s * s;
      }
      const rms = Math.sqrt(sumSquares / len);

      // Detect dead / silent microphone input stream (and auto-recover AudioContext once if needed)
      if (maxAbs < 1e-6) {
        this.silentFrames++;
        if (this.silentFrames === 45 && !this.hasRetriedGraph && this.mediaStream?.active) {
          this.hasRetriedGraph = true;
          this.audioCtx?.close().catch(() => {});
          this.audioCtx = null;
          this.setupAudioGraph(this.mediaStream).catch(() => {});
        } else if (this.silentFrames === 110 && !this.hasWarnedSilence && this.isEnabled) {
          this.hasWarnedSilence = true;
          this.setState('listening', 'No signal — unmute or switch mic below 🎙️');
        }
      } else {
        if (this.hasWarnedSilence && this.isEnabled) {
          this.hasWarnedSilence = false;
          this.setState('listening', 'Blow into your mic or headphones 🌬️');
        }
        this.silentFrames = 0;
      }

      // Convert RMS and Peak to decibels
      const rmsDb = 20 * Math.log10(Math.max(rms, 0.00002));
      const peakDb = 20 * Math.log10(Math.max(maxAbs, 0.00002));
      const combinedDb = rmsDb * 0.65 + peakDb * 0.35;

      // Broadband FFT energy across 0–4kHz (both wind rumble AND air rush hiss)
      let fftSum = 0;
      const fftBins = Math.min(44, this.freqData.length);
      for (let i = 0; i < fftBins; i++) {
        fftSum += this.freqData[i];
      }
      const fftAvg = fftSum / fftBins; // 0..255
      const fftBonusDb = Math.max(0, (fftAvg - 15) * 0.18);

      const effectiveDb = combinedDb + fftBonusDb;

      // Emit raw mic level [0, 1] for live equalizer & dB readout
      const rawMicLevel = maxAbs < 1e-6 ? 0 : Math.min(1, Math.max(0, (combinedDb + 70) / 50));
      this.callbacks.onMicLevel?.(rawMicLevel, Math.round(combinedDb));

      // 2. Track ambient floor dynamically (fast downward decay, very slow upward drift)
      if (maxAbs > 1e-6) {
        if (this.calibrationFrames < 15) {
          this.noiseFloorDb =
            this.calibrationFrames === 0
              ? combinedDb
              : this.noiseFloorDb * 0.75 + combinedDb * 0.25;
          this.calibrationFrames++;
        } else if (combinedDb < this.noiseFloorDb) {
          this.noiseFloorDb = this.noiseFloorDb * 0.88 + combinedDb * 0.12;
        } else if (combinedDb < this.noiseFloorDb + 3.0) {
          this.noiseFloorDb = this.noiseFloorDb * 0.992 + combinedDb * 0.008;
        }
        this.noiseFloorDb = Math.max(-74.0, Math.min(-34.0, this.noiseFloorDb));
      }

      // 3. Normalized breath intensity [0.0, 1.0]
      const triggerMargin = this.sensitivity === 'high' ? 4.0 : 7.5;
      const fullScaleSpan = this.sensitivity === 'high' ? 12.0 : 18.0;

      const dbAboveFloor = effectiveDb - this.noiseFloorDb;
      let instantIntensity = 0.0;

      if (maxAbs > 1e-6 && dbAboveFloor > triggerMargin) {
        instantIntensity = Math.min(1.0, (dbAboveFloor - triggerMargin) / fullScaleSpan);
      }

      // Absolute signal catch (works immediately even if user starts blowing during calibration)
      const absThresholdDb = this.sensitivity === 'high' ? -24.0 : -16.0;
      if (combinedDb > absThresholdDb || peakDb > -12.0) {
        instantIntensity = Math.max(instantIntensity, 0.85);
      }

      const attackRelease = instantIntensity > this.smoothedIntensity ? 0.55 : 0.24;
      this.smoothedIntensity =
        this.smoothedIntensity * (1 - attackRelease) + instantIntensity * attackRelease;

      if (this.smoothedIntensity < 0.015) {
        this.smoothedIntensity = 0;
      }

      // 4. Progressive blow charge & blowout evaluation
      if (this.isEnabled) {
        if (this.smoothedIntensity > 0.12) {
          const chargeRate = 1.6 + this.smoothedIntensity * 2.6;
          this.blowProgress = Math.min(1.0, this.blowProgress + dt * chargeRate);
        } else {
          this.blowProgress = Math.max(0, this.blowProgress - dt * 0.8);
        }

        if (this.callbacks.onBreath) {
          this.callbacks.onBreath(this.smoothedIntensity, this.blowProgress);
        }

        const isInstantPuff = instantIntensity >= 0.8 && this.blowProgress >= 0.18;
        if (this.blowProgress >= 1.0 || isInstantPuff) {
          this.handleBlowSuccess();
          return;
        }
      }

      this.animFrameId = requestAnimationFrame(analyze);
    };

    this.animFrameId = requestAnimationFrame(analyze);
  }

  private handleBlowSuccess() {
    this.isEnabled = false;
    this.blowProgress = 1.0;
    this.setState('blown', 'Candle blown out! 🎂✨');
    if (this.callbacks.onBreath) {
      this.callbacks.onBreath(1.0, 1.0);
    }
    if (this.callbacks.onBlowOut) {
      this.callbacks.onBlowOut();
    }
  }

  /**
   * Reset the detector to listening mode (e.g. after Re-lighting candle).
   */
  public reset() {
    this.blowProgress = 0;
    this.smoothedIntensity = 0;
    this.lastTimestamp = performance.now();

    if (this.mediaStream && this.mediaStream.active) {
      this.isEnabled = true;
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      this.setState('listening', 'Blow into your mic or headphones 🌬️');
      if (!this.animFrameId) {
        this.startLoop();
      }
    } else {
      this.isEnabled = false;
    }
  }

  public stopListening() {
    this.isEnabled = false;
    this.blowProgress = 0;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.callbacks.onBreath) {
      this.callbacks.onBreath(0, 0);
    }
  }

  private stopStream() {
    this.stopListening();
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  public destroy() {
    this.stopStream();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.setState('idle');
  }

  private setState(state: BreathDetectorState, message?: string) {
    this.state = state;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state, message);
    }
  }
}
