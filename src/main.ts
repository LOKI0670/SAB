import confetti from 'canvas-confetti';
import { giftConfig } from './config/giftConfig';
import { soundEngine } from './audio/SoundEngine';
import { BreathDetector, BreathDetectorState } from './audio/BreathDetector';
import { MagicCursor } from './effects/MagicCursor';

class BirthdayExperienceApp {
  private breathDetector!: BreathDetector;
  private isAssemblyComplete: boolean = false;
  private isCandleLit: boolean = false;
  private hasBlownCandle: boolean = false;
  private assemblyTimers: number[] = [];

  // DOM Elements
  private introOverlay!: HTMLElement;
  private openGiftBtn!: HTMLButtonElement;
  private musicToggleBtn!: HTMLButtonElement;
  private replayCakeBtn!: HTMLButtonElement;
  private cardGlow!: HTMLElement;
  private greetingContainer!: HTMLElement;
  private cursiveGreeting!: HTMLElement;
  private recipientName!: HTMLElement;
  private specialDateSubtext!: HTMLElement;
  private interactionBar!: HTMLElement;
  private blowCandleBtn!: HTMLButtonElement;
  private celebrationNav!: HTMLElement;

  // Animated SVG Cake & Candle Elements
  private cakeStage!: HTMLElement;
  private cakeSvg!: SVGSVGElement;
  private cakeCandle!: HTMLElement;
  private candleFlameWrap!: HTMLElement;
  private smokeContainer!: HTMLElement;
  private startAnimElement!: SVGAnimateElement;

  // Microphone & Breath Visualizer Elements
  private micStatusContainer!: HTMLElement;
  private micToggleBtn!: HTMLButtonElement;
  private micBoostBtn!: HTMLButtonElement;
  private micBoostText!: HTMLElement;
  private micDeviceSelect!: HTMLSelectElement;
  private micBtnText!: HTMLElement;
  private micBtnIcon!: HTMLElement;
  private micStatusLabel!: HTMLElement;
  private micIconIndicator!: HTMLElement;
  private micEqBars!: NodeListOf<HTMLElement>;
  private micRawBar!: HTMLElement;
  private breathMeterBar!: HTMLElement;
  private interactionHint!: HTMLElement;

  // Outer Background Elements
  private outerBgOrbs!: HTMLElement;
  private outerBgImage!: HTMLImageElement;
  private outerBgVideo!: HTMLVideoElement;

  // Modals
  private letterModal!: HTMLElement;
  private closeLetterBtn!: HTMLButtonElement;
  private memoriesModal!: HTMLElement;
  private closeMemoriesBtn!: HTMLButtonElement;
  private polaroidContainer!: HTMLElement;
  private letterBodyContent!: HTMLElement;
  private letterRecipientTitle!: HTMLElement;
  private letterSignatureContent!: HTMLElement;

  constructor() {
    this.queryDOMElements();
    this.populateConfigData();
    this.initMagicCursor();
    this.initBreathDetector();
    this.bindEvents();
  }

  private queryDOMElements() {
    this.introOverlay = document.getElementById('intro-overlay')!;
    this.openGiftBtn = document.getElementById('open-gift-btn') as HTMLButtonElement;
    this.musicToggleBtn = document.getElementById('music-toggle-btn') as HTMLButtonElement;
    this.replayCakeBtn = document.getElementById('camera-reset-btn') as HTMLButtonElement;
    this.cardGlow = document.getElementById('card-glow')!;
    this.greetingContainer = document.getElementById('greeting-container')!;
    this.cursiveGreeting = document.getElementById('cursive-greeting')!;
    this.recipientName = document.getElementById('recipient-name')!;
    this.specialDateSubtext = document.getElementById('special-date-subtext')!;
    this.interactionBar = document.getElementById('interaction-bar')!;
    this.blowCandleBtn = document.getElementById('blow-candle-btn') as HTMLButtonElement;
    this.celebrationNav = document.getElementById('celebration-nav')!;

    // Animated Cake & Candle
    this.cakeStage = document.getElementById('cake-stage')!;
    this.cakeSvg = document.getElementById('cake') as unknown as SVGSVGElement;
    this.cakeCandle = document.getElementById('cake-candle')!;
    this.candleFlameWrap = document.getElementById('candle-flame-wrap')!;
    this.smokeContainer = document.getElementById('smoke-container')!;
    this.startAnimElement = document.getElementById('bizcocho_1') as unknown as SVGAnimateElement;

    // Microphone & Breath UI
    this.micStatusContainer = document.getElementById('mic-status-container')!;
    this.micToggleBtn = document.getElementById('mic-toggle-btn') as HTMLButtonElement;
    this.micBoostBtn = document.getElementById('mic-boost-btn') as HTMLButtonElement;
    this.micBoostText = document.getElementById('mic-boost-text')!;
    this.micDeviceSelect = document.getElementById('mic-device-select') as HTMLSelectElement;
    this.micBtnText = document.getElementById('mic-btn-text')!;
    this.micBtnIcon = document.getElementById('mic-btn-icon')!;
    this.micStatusLabel = document.getElementById('mic-status-label')!;
    this.micIconIndicator = document.getElementById('mic-icon-indicator')!;
    this.micEqBars = document.querySelectorAll('#mic-live-eq span');
    this.micRawBar = document.getElementById('mic-raw-bar')!;
    this.breathMeterBar = document.getElementById('breath-meter-bar')!;
    this.interactionHint = document.getElementById('interaction-hint')!;

    // Outer Background
    this.outerBgOrbs = document.getElementById('outer-bg-orbs')!;
    this.outerBgImage = document.getElementById('outer-bg-image') as HTMLImageElement;
    this.outerBgVideo = document.getElementById('outer-bg-video') as HTMLVideoElement;

    // Modals
    this.letterModal = document.getElementById('letter-modal')!;
    this.closeLetterBtn = document.getElementById('close-letter-btn') as HTMLButtonElement;
    this.memoriesModal = document.getElementById('memories-modal')!;
    this.closeMemoriesBtn = document.getElementById('close-memories-btn') as HTMLButtonElement;
    this.polaroidContainer = document.getElementById('polaroid-container')!;
    this.letterBodyContent = document.getElementById('letter-body-content')!;
    this.letterRecipientTitle = document.getElementById('letter-recipient-title')!;
    this.letterSignatureContent = document.getElementById('letter-signature-content')!;
  }

  private populateConfigData() {
    // 1. Hero Card Typography
    this.cursiveGreeting.textContent = giftConfig.cardGreeting;
    this.recipientName.textContent = giftConfig.recipientName;
    this.specialDateSubtext.textContent = `${giftConfig.birthdayDate} ❤️`;

    // 2. Love Letter
    this.letterRecipientTitle.textContent = giftConfig.loveLetter.salutation;
    this.letterBodyContent.innerHTML = giftConfig.loveLetter.paragraphs
      .map(p => `<p>${p}</p>`)
      .join('');
    this.letterSignatureContent.innerHTML = `${giftConfig.loveLetter.closing}<br><span class="signature-name">${giftConfig.loveLetter.signature}</span>`;

    // 3. Polaroid Gallery
    this.polaroidContainer.innerHTML = giftConfig.memories
      .map(mem => `
        <div class="polaroid-item" style="transform: rotate(${mem.rotation || 0}deg)">
          <div class="polaroid-photo-wrapper">
            <img class="polaroid-img" src="${mem.image}" alt="${mem.caption}" loading="lazy" />
          </div>
          <div class="polaroid-caption">${mem.caption}</div>
          ${mem.date ? `<div class="polaroid-date">${mem.date}</div>` : ''}
        </div>
      `)
      .join('');

    // 4. Outer Background (Ambient / Image / Moving Video)
    const bg = giftConfig.background;
    if (bg) {
      document.documentElement.style.setProperty('--outer-bg-blur', `${bg.blurPx ?? 2}px`);
      document.documentElement.style.setProperty('--outer-bg-dim', `${bg.dimOpacity ?? 0.32}`);

      if (bg.type === 'image' && bg.url) {
        this.outerBgOrbs.classList.add('hidden');
        this.outerBgVideo.classList.add('hidden');
        this.outerBgImage.src = bg.url;
        this.outerBgImage.classList.remove('hidden');
      } else if (bg.type === 'video' && bg.url) {
        this.outerBgOrbs.classList.add('hidden');
        this.outerBgImage.classList.add('hidden');
        this.outerBgVideo.src = bg.url;
        this.outerBgVideo.muted = true;
        this.outerBgVideo.loop = true;
        this.outerBgVideo.playsInline = true;
        this.outerBgVideo.classList.remove('hidden');
        this.outerBgVideo.play().catch(() => {});
      }
    }
  }

  private initMagicCursor() {
    const cursorCanvas = document.getElementById('magicCursor') as HTMLCanvasElement | null;
    if (cursorCanvas) {
      new MagicCursor(cursorCanvas);
    }
  }

  private initBreathDetector() {
    this.breathDetector = new BreathDetector({
      onStateChange: (state: BreathDetectorState, message?: string) => {
        this.handleBreathStateChange(state, message);
      },
      onDevicesUpdated: (devices, activeDeviceId) => {
        if (this.micDeviceSelect) {
          this.micDeviceSelect.innerHTML = devices
            .map(
              (d) =>
                `<option value="${d.deviceId}" ${d.deviceId === activeDeviceId ? 'selected' : ''}>🎙️ ${d.label}</option>`
            )
            .join('');
          if (devices.length > 0) {
            this.micDeviceSelect.classList.remove('hidden');
          } else {
            this.micDeviceSelect.classList.add('hidden');
          }
        }
        const active = devices.find((d) => d.deviceId === activeDeviceId) ?? devices[0];
        if (active && this.interactionHint) {
          this.interactionHint.textContent = `Mic: ${active.label}`;
        }
      },
      onMicLevel: (level: number, peakDb: number) => {
        // Animate the 5-bar live mic equalizer whenever any sound hits the microphone
        const weights = [0.55, 0.9, 1.0, 0.85, 0.6];
        this.micEqBars.forEach((bar, idx) => {
          const jitter = 0.8 + Math.random() * 0.35;
          const h = Math.max(3, Math.min(14, 3 + level * 11 * weights[idx] * jitter));
          bar.style.height = `${h.toFixed(1)}px`;
        });
        if (this.micRawBar) {
          this.micRawBar.style.width = `${Math.round(level * 100)}%`;
        }
        if (this.interactionHint && this.breathDetector.getIsEnabled() && peakDb > -90) {
          const activeText = this.micDeviceSelect?.selectedOptions?.[0]?.textContent?.replace(/^🎙️\s*/, '') || 'Mic';
          this.interactionHint.textContent = `${activeText} • ${peakDb} dB`;
        }
      },
      onBreath: (intensity: number, progress: number) => {
        if (!this.hasBlownCandle && this.isCandleLit) {
          // Bend and squash the CSS flame dynamically with breath intensity + charge
          const force = Math.max(intensity, progress * 0.65);
          const tilt = force * (0.85 + Math.random() * 0.35);
          this.candleFlameWrap.style.setProperty('--wind-tilt', tilt.toFixed(3));
          this.candleFlameWrap.style.setProperty('--wind-squash', force.toFixed(3));
        }

        // Real-time visual breath meter animation
        if (this.breathMeterBar) {
          const display = Math.max(intensity * 0.45, progress);
          const pct = Math.min(100, Math.round(display * 100));
          this.breathMeterBar.style.width = `${pct}%`;
        }
      },
      onBlowOut: () => {
        this.triggerBlowOut();
      }
    });
  }

  private handleBreathStateChange(state: BreathDetectorState, message?: string) {
    if (message) {
      this.micStatusLabel.textContent = message;
    }

    if (state === 'listening') {
      this.micToggleBtn.className = 'action-pill-btn mic-btn active';
      this.micBtnText.textContent = 'Mic Active';
      this.micBtnIcon.textContent = '🎙️';
      this.micIconIndicator.textContent = '🎙️';
    } else if (state === 'requesting') {
      this.micToggleBtn.className = 'action-pill-btn mic-btn';
      this.micBtnText.textContent = 'Allow Mic...';
      this.micBtnIcon.textContent = '🎙️';
      this.micIconIndicator.textContent = '🎙️';
    } else if (state === 'denied' || state === 'unsupported') {
      this.micToggleBtn.className = 'action-pill-btn mic-btn blocked';
      this.micBtnText.textContent = 'Enable Mic';
      this.micBtnIcon.textContent = '🔇';
      this.micIconIndicator.textContent = '⚠️';
      if (!message) {
        this.micStatusLabel.textContent = 'Mic unavailable • Tap candle or button to blow';
      }
    } else if (state === 'blown') {
      this.micStatusLabel.textContent = 'Wish Made! 🎂✨';
      this.micToggleBtn.className = 'action-pill-btn mic-btn';
      this.micBtnText.textContent = 'Wish Granted';
    } else {
      this.micToggleBtn.className = 'action-pill-btn mic-btn';
      this.micBtnText.textContent = 'Enable Mic';
      this.micBtnIcon.textContent = '🎙️';
    }
  }

  private bindEvents() {
    // Open Gift Button (Unlocks Audio & Requests Mic Permission within User Gesture)
    this.openGiftBtn.addEventListener('click', () => {
      this.startExperience();
    });

    // Music Toggle Button
    this.musicToggleBtn.addEventListener('click', () => {
      const isPlaying = soundEngine.toggleMusic();
      if (isPlaying) {
        this.musicToggleBtn.classList.add('playing');
      } else {
        this.musicToggleBtn.classList.remove('playing');
      }
    });

    // Replay Cake Animation Button
    this.replayCakeBtn.addEventListener('click', () => {
      this.playCakeAssembly();
    });

    // Tap Candle or Cake to Blow Out
    this.cakeCandle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isCandleLit) {
        this.triggerBlowOut();
      }
    });

    this.cakeCandle.addEventListener('keydown', (e) => {
      if ((e.code === 'Enter' || e.code === 'Space') && this.isCandleLit) {
        e.preventDefault();
        this.triggerBlowOut();
      }
    });

    this.cakeSvg.addEventListener('click', () => {
      if (this.isCandleLit && !this.hasBlownCandle) {
        this.triggerBlowOut();
      }
    });

    // Floating Balloon Pop Interaction
    document.querySelectorAll<HTMLElement>('.balloon').forEach((balloon) => {
      balloon.addEventListener('click', () => {
        const rect = balloon.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        const color = getComputedStyle(balloon).backgroundColor;

        soundEngine.playCandleTap();
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { x, y },
          colors: [color, '#ffffff', '#C0C0C0']
        });

        balloon.remove();
      });
    });

    // Blow Candle Button (Manual fallback)
    this.blowCandleBtn.addEventListener('click', () => {
      this.triggerBlowOut();
    });

    // Microphone Blow Toggle Button
    this.micToggleBtn.addEventListener('click', async () => {
      if (this.breathDetector.getIsEnabled()) {
        this.breathDetector.disableDetection();
        this.handleBreathStateChange('idle', 'Mic paused • Tap candle or button');
      } else {
        const ok = await this.breathDetector.start();
        if (ok && this.isAssemblyComplete && !this.hasBlownCandle) {
          this.breathDetector.enableDetection();
        }
      }
    });

    // Clicking status pill when mic is off/denied also retries enabling mic
    this.micStatusContainer.addEventListener('click', async () => {
      if (!this.breathDetector.getIsEnabled() && !this.hasBlownCandle) {
        const ok = await this.breathDetector.start();
        if (ok && this.isAssemblyComplete) {
          this.breathDetector.enableDetection();
        }
      }
    });

    // Sensitivity Boost Toggle (High vs Normal)
    this.micBoostBtn.addEventListener('click', () => {
      const next = this.breathDetector.getSensitivity() === 'high' ? 'normal' : 'high';
      this.breathDetector.setSensitivity(next);
      if (next === 'high') {
        this.micBoostBtn.classList.add('active');
        this.micBoostText.textContent = 'Boost: ON';
      } else {
        this.micBoostBtn.classList.remove('active');
        this.micBoostText.textContent = 'Boost: Normal';
      }
    });

    // Switch Microphone / Headset Input from Dropdown
    this.micDeviceSelect.addEventListener('change', async () => {
      const deviceId = this.micDeviceSelect.value;
      if (deviceId) {
        await this.breathDetector.selectDevice(deviceId);
      }
    });

    // Keyboard space bar shortcut to blow candle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.isAssemblyComplete && !this.hasBlownCandle) {
        e.preventDefault();
        this.triggerBlowOut();
      }
    });

    // Celebration Navigation Tabs
    const navPills = this.celebrationNav.querySelectorAll('.nav-pill');
    navPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const tab = (pill as HTMLElement).dataset.tab;
        this.handleNavTabClick(tab);
      });
    });

    // Modal Close Buttons
    this.closeLetterBtn.addEventListener('click', () => {
      this.letterModal.classList.add('hidden');
      this.setActiveNavPill('cake');
    });

    this.closeMemoriesBtn.addEventListener('click', () => {
      this.memoriesModal.classList.add('hidden');
      this.setActiveNavPill('cake');
    });

    // Close modals on overlay backdrop click
    this.letterModal.addEventListener('click', (e) => {
      if (e.target === this.letterModal) {
        this.letterModal.classList.add('hidden');
        this.setActiveNavPill('cake');
      }
    });

    this.memoriesModal.addEventListener('click', (e) => {
      if (e.target === this.memoriesModal) {
        this.memoriesModal.classList.add('hidden');
        this.setActiveNavPill('cake');
      }
    });
  }

  private startExperience() {
    // 1. Initialize audio context & start music + any background video
    soundEngine.init();
    soundEngine.startBackgroundMusic();
    this.musicToggleBtn.classList.add('playing');
    if (giftConfig.background?.type === 'video' && this.outerBgVideo.src) {
      this.outerBgVideo.play().catch(() => {});
    }

    // 2. Request mic access immediately on the user tap gesture
    this.breathDetector.start().then((ok) => {
      if (ok && this.isAssemblyComplete && !this.hasBlownCandle) {
        this.breathDetector.enableDetection();
      }
    }).catch(() => {});

    // 3. Fade out intro overlay
    this.introOverlay.classList.add('fade-out');

    // 4. Play SVG layered cake assembly + candle drop + ignition
    this.playCakeAssembly();
  }

  private clearAssemblyTimers() {
    this.assemblyTimers.forEach((id) => clearTimeout(id));
    this.assemblyTimers = [];
  }

  private schedule(fn: () => void, ms: number) {
    this.assemblyTimers.push(window.setTimeout(fn, ms));
  }

  private playCakeAssembly() {
    this.clearAssemblyTimers();
    this.isAssemblyComplete = false;
    this.isCandleLit = false;
    this.hasBlownCandle = false;
    this.breathDetector.disableDetection();

    this.cardGlow.classList.remove('active');
    this.cakeCandle.classList.remove('is-lit', 'is-extinguished');
    this.candleFlameWrap.style.setProperty('--wind-tilt', '0');
    this.candleFlameWrap.style.setProperty('--wind-squash', '0');

    // Restart CSS candle drop animation cleanly
    this.cakeStage.classList.remove('is-animated');
    void this.cakeStage.offsetWidth;

    try {
      if (typeof this.cakeSvg.setCurrentTime === 'function') {
        this.cakeSvg.setCurrentTime(0);
      }
    } catch {
      // Ignore if SMIL setCurrentTime isn't supported
    }

    this.cakeStage.classList.add('is-animated');

    // Start SVG SMIL chain (bizcocho_1 -> relleno_1 -> bizcocho_2 -> relleno_2 -> bizcocho_3 -> crema)
    this.schedule(() => {
      soundEngine.playChime();
      try {
        this.startAnimElement.beginElement();
      } catch {
        // Fallback if SVGAnimationElement.beginElement is unavailable
      }
    }, 250);

    // Synchronized layer drop SFX
    this.schedule(() => soundEngine.playDropThud(), 700);
    this.schedule(() => soundEngine.playDropThud(), 1800);
    this.schedule(() => soundEngine.playDropThud(), 2700);
    this.schedule(() => soundEngine.playCreamSwoosh(), 4100);
    this.schedule(() => soundEngine.playCandleTap(), 5050);

    // Candle lands & flame ignites (~5.15s)
    this.schedule(() => {
      this.isAssemblyComplete = true;
      this.isCandleLit = true;
      this.cakeCandle.classList.add('is-lit');
      this.cardGlow.classList.add('active');
      soundEngine.playIgnition();

      // Reveal card typography & interactive blow bar
      this.greetingContainer.classList.add('visible');
      this.interactionBar.classList.add('visible');

      // Enable live microphone breath detection
      if (this.breathDetector.getState() === 'listening') {
        this.breathDetector.enableDetection();
      }
    }, 5150);
  }

  private triggerBlowOut() {
    if (this.hasBlownCandle) return;
    this.hasBlownCandle = true;
    this.isCandleLit = false;

    // 1. Play realistic breath puff sound
    soundEngine.playBlowOut();

    // 2. Stop microphone blow triggers & reset breath meter / flame tilt
    this.breathDetector.disableDetection();
    this.candleFlameWrap.style.setProperty('--wind-tilt', '0');
    this.candleFlameWrap.style.setProperty('--wind-squash', '0');
    if (this.breathMeterBar) {
      this.breathMeterBar.style.width = '100%';
      setTimeout(() => {
        this.breathMeterBar.style.width = '0%';
      }, 700);
    }

    // 3. Dim card glow, extinguish flame & spawn smoke wisps
    this.cardGlow.classList.remove('active');
    this.interactionBar.classList.remove('visible');
    this.cakeCandle.classList.remove('is-lit');
    this.cakeCandle.classList.add('is-extinguished');
    this.spawnSmokeWisps();

    // 4. Celebration Fanfare, Confetti & Bottom Nav
    setTimeout(() => {
      soundEngine.playCelebrationChime();
      this.launchCelebrationConfetti();
      this.celebrationNav.classList.remove('hidden');
    }, 250);
  }

  private spawnSmokeWisps() {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const wisp = document.createElement('span');
        wisp.className = 'smoke-wisp';
        const driftX = (Math.random() - 0.5) * 32;
        wisp.style.setProperty('--smoke-x', `${driftX.toFixed(1)}px`);
        this.smokeContainer.appendChild(wisp);
        setTimeout(() => wisp.remove(), 1300);
      }, i * 65);
    }
  }

  private launchCelebrationConfetti() {
    const colors = ['#D4AF37', '#C0C0C0', '#ffffff', '#F5F5DC', '#f7a5a5'];
    const end = Date.now() + 2600;

    const frame = () => {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }

  private handleNavTabClick(tab: string | undefined) {
    if (!tab) return;

    this.setActiveNavPill(tab);

    if (tab === 'cake') {
      this.letterModal.classList.add('hidden');
      this.memoriesModal.classList.add('hidden');
    } else if (tab === 'letter') {
      this.memoriesModal.classList.add('hidden');
      this.letterModal.classList.remove('hidden');
    } else if (tab === 'memories') {
      this.letterModal.classList.add('hidden');
      this.memoriesModal.classList.remove('hidden');
    } else if (tab === 'relight') {
      this.letterModal.classList.add('hidden');
      this.memoriesModal.classList.add('hidden');
      this.relightCandle();
    }
  }

  private setActiveNavPill(tab: string) {
    const pills = this.celebrationNav.querySelectorAll('.nav-pill');
    pills.forEach(p => {
      if ((p as HTMLElement).dataset.tab === tab) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  private relightCandle() {
    soundEngine.playIgnition();
    this.isCandleLit = true;
    this.hasBlownCandle = false;
    this.cakeCandle.classList.remove('is-extinguished');
    this.cakeCandle.classList.add('is-lit');
    this.candleFlameWrap.style.setProperty('--wind-tilt', '0');
    this.candleFlameWrap.style.setProperty('--wind-squash', '0');
    this.cardGlow.classList.add('active');
    this.interactionBar.classList.add('visible');
    this.breathDetector.reset();
    this.setActiveNavPill('cake');
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new BirthdayExperienceApp();
});
