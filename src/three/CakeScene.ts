import * as THREE from 'three';
import { SmoothCake } from './SmoothCake';

export interface CakeSceneEvents {
  onCandleTapped?: () => void;
}

export class CakeScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public cake: SmoothCake;

  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private clock = new THREE.Clock();

  // Smooth inertia orbit
  private isDragging = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private targetRotX = 0.12; // Natural slight eye-level tilt
  private targetRotY = 0.0;
  private currentRotX = 0.12;
  private currentRotY = 0.0;
  private readonly defaultRotX = 0.12;
  private readonly defaultRotY = 0.0;

  // Raycaster for tap detection
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private events: CakeSceneEvents;

  constructor(canvas: HTMLCanvasElement, container: HTMLElement, events: CakeSceneEvents = {}) {
    this.canvas = canvas;
    this.container = container;
    this.events = events;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    const W = container.clientWidth || 380;
    const H = container.clientHeight || 560;
    this.camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 50);
    this.updateCameraPos();

    // 3. High Performance Renderer (zero shadow map overhead)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // Transparent so the blush pink card shows behind
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false; // Zero shadow map GPU passes!

    // 4. Studio Lighting
    this.setupLighting();

    // 5. Add Ultra-Smooth Cake
    this.cake = new SmoothCake();
    this.cake.group.scale.setScalar(0.76);
    this.cake.group.position.set(0, 0.34, 0); // Positioned in upper stage of card
    this.scene.add(this.cake.group);

    // 6. Bind Listeners & Render Loop
    this.bindListeners();
    this.startLoop();
  }

  private updateCameraPos() {
    const W = this.container.clientWidth || 380;
    const H = this.container.clientHeight || 560;
    const isMobile = W < 600;
    const aspect = W / Math.max(1, H);
    // Keep cake well framed horizontally on narrow mobile screens and cleanly above the greeting text
    const dist = isMobile ? Math.max(6.4, 4.4 / aspect) : 5.6;
    this.camera.position.set(0, 1.0, dist);
    this.camera.lookAt(0, isMobile ? 0.45 : 0.52, 0);
  }

  private setupLighting() {
    // Soft warm ambient fill
    this.scene.add(new THREE.AmbientLight(0xfff6f0, 1.05));

    // Key light (soft sun highlight from top-right)
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(3.5, 6, 4.5);
    this.scene.add(key);

    // Fill light (warm peach fill from bottom-left)
    const fill = new THREE.DirectionalLight(0xffdcd6, 0.65);
    fill.position.set(-3.5, 2.5, 3.5);
    this.scene.add(fill);

    // Specular rim light (adds glossy gleam to frosting and candle)
    const rim = new THREE.DirectionalLight(0xffe8e0, 0.75);
    rim.position.set(-3, 4, -4);
    this.scene.add(rim);
  }

  private bindListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.onResize());
      ro.observe(this.container);
    }
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('pointercancel', () => {
      this.isDragging = false;
    });

    // Mobile gyroscope gentle parallax
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null) return;
        this.targetRotY = this.defaultRotY + (e.gamma / 45) * 0.22;
        this.targetRotX = THREE.MathUtils.clamp(
          this.defaultRotX + ((e.beta - 45) / 45) * 0.12,
          -0.05,
          0.4
        );
      });
    }
  }

  private onPointerDown(e: PointerEvent) {
    this.isDragging = true;
    this.prevPointerX = e.clientX;
    this.prevPointerY = e.clientY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Only treat as a tap if the finger/mouse didn't drag to rotate the cake
    const moved = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
    if (moved < 16 && this.cake.isLit) {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((e.clientY - rect.top) / rect.height) * -2 + 1;
      this.mouseVec.set(nx, ny);
      this.raycaster.setFromCamera(this.mouseVec, this.camera);
      const hits = this.raycaster.intersectObjects(
        [
          ...this.cake.candleGroup.children,
          ...this.cake.flameGroup.children,
          ...this.cake.frostingGroup.children,
          ...this.cake.decorationsGroup.children,
          ...this.cake.spongeGroup.children
        ],
        true
      );
      // Direct raycast hit or tap anywhere in the candle/top cake region
      const tappedNearCandle = (nx > -0.45 && nx < 0.45 && ny > -0.25 && ny < 0.75);
      if (hits.length > 0 || tappedNearCandle) {
        this.events.onCandleTapped?.();
      }
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (this.isDragging) {
      this.targetRotY += (e.clientX - this.prevPointerX) * 0.007;
      this.targetRotX += (e.clientY - this.prevPointerY) * 0.005;
      this.targetRotX = THREE.MathUtils.clamp(this.targetRotX, -0.05, 0.5);
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    } else if (e.pointerType === 'mouse') {
      // Desktop mouse hover parallax
      const rect = this.canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      this.targetRotY = this.defaultRotY + nx * 0.38;
      this.targetRotX = THREE.MathUtils.clamp(this.defaultRotX + ny * 0.2, -0.05, 0.42);
    }
  }

  public resetView() {
    this.targetRotX = this.defaultRotX;
    this.targetRotY = this.defaultRotY;
  }

  private onResize() {
    const W = this.container.clientWidth;
    const H = this.container.clientHeight;
    if (!W || !H) return;
    this.camera.aspect = W / H;
    this.updateCameraPos();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  private startLoop() {
    const tick = () => {
      requestAnimationFrame(tick);

      const delta = this.clock.getDelta();

      // Smooth inertia interpolation (0.09 lerp factor)
      this.currentRotX += (this.targetRotX - this.currentRotX) * 0.09;
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.09;
      this.cake.group.rotation.x = this.currentRotX;
      this.cake.group.rotation.y = this.currentRotY;

      this.cake.update(delta);
      this.renderer.render(this.scene, this.camera);
    };

    tick();
  }
}
