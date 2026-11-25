import * as THREE from 'three';
import { gsap } from 'gsap';

export interface CakeAnimationCallbacks {
  onAssemblyComplete?: () => void;
  onExtinguishComplete?: () => void;
}

/**
 * Ultra-Smooth 3D Birthday Cake
 * Designed with smooth rounded geometries, soft contact shadows, and zero GPU shadow map overhead
 * for locked 60+ FPS on all devices.
 */
export class SmoothCake {
  public group: THREE.Group;

  // Staggered animation groups
  public plateGroup: THREE.Group;
  public spongeGroup: THREE.Group;
  public frostingGroup: THREE.Group;
  public decorationsGroup: THREE.Group;
  public candleGroup: THREE.Group;
  public flameGroup: THREE.Group;
  public smokeGroup: THREE.Group;

  // Lighting
  public flameLight: THREE.PointLight;
  public isLit: boolean = false;

  private flameOuter!: THREE.Mesh;
  private flameMid!: THREE.Mesh;
  private flameCore!: THREE.Mesh;
  private smokeParticles: Array<{
    mesh: THREE.Mesh;
    velX: number;
    velY: number;
    velZ: number;
    life: number;
    maxLife: number;
  }> = [];

  private time: number = 0;
  private windIntensity: number = 0;

  public applyWind(intensity: number) {
    this.windIntensity = Math.min(1.0, Math.max(0, intensity));
  }

  // Shared lightweight materials
  private matPlate = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.05
  });

  private matGoldRim = new THREE.MeshStandardMaterial({
    color: 0xd4a35a,
    roughness: 0.25,
    metalness: 0.85
  });

  private matChocolate = new THREE.MeshStandardMaterial({
    color: 0x5a3422, // Rich milk/dark chocolate
    roughness: 0.65,
    metalness: 0.02
  });

  private matGanache = new THREE.MeshStandardMaterial({
    color: 0x331a0e, // Deep glossy chocolate ganache
    roughness: 0.25,
    metalness: 0.08
  });

  private matFrosting = new THREE.MeshStandardMaterial({
    color: 0xfdfdfd, // Silky pure vanilla cream
    roughness: 0.16,
    metalness: 0.02
  });

  private matBerry = new THREE.MeshStandardMaterial({
    color: 0xd92534, // Glossy ruby red berry
    roughness: 0.14,
    metalness: 0.05
  });

  private matCandle = new THREE.MeshStandardMaterial({
    color: 0xfafafa,
    roughness: 0.25,
    metalness: 0.02
  });

  private matCandleStripe = new THREE.MeshStandardMaterial({
    color: 0xf7a5b8, // Cute pastel rose stripe
    roughness: 0.25,
    metalness: 0.02
  });

  private matWick = new THREE.MeshStandardMaterial({
    color: 0x1c1c1c,
    roughness: 0.95
  });

  constructor() {
    this.group = new THREE.Group();

    this.plateGroup = new THREE.Group();
    this.spongeGroup = new THREE.Group();
    this.frostingGroup = new THREE.Group();
    this.decorationsGroup = new THREE.Group();
    this.candleGroup = new THREE.Group();
    this.flameGroup = new THREE.Group();
    this.smokeGroup = new THREE.Group();

    this.group.add(
      this.plateGroup,
      this.spongeGroup,
      this.frostingGroup,
      this.decorationsGroup,
      this.candleGroup,
      this.flameGroup,
      this.smokeGroup
    );

    // Warm candle light - direct point light without heavy shadow map
    this.flameLight = new THREE.PointLight(0xffa244, 0, 8, 2.0);
    this.flameGroup.add(this.flameLight);

    this.buildPlate();
    this.buildSpongeCake();
    this.buildFrostingAndDrips();
    this.buildDecorations();
    this.buildCandle();
    this.buildFlame();

    this.resetToInitialState();
  }

  /**
   * 1. Plate: Ceramic dish with soft bevel and contact shadow
   */
  private buildPlate() {
    const plateRadius = 1.65;

    // Contact shadow beneath plate
    const shadowGeo = new THREE.PlaneGeometry(plateRadius * 2.3, plateRadius * 2.3);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.08;
    this.plateGroup.add(shadowMesh);

    // Porcelain plate disc
    const plateGeo = new THREE.CylinderGeometry(plateRadius, plateRadius * 0.9, 0.11, 48);
    const plateMesh = new THREE.Mesh(plateGeo, this.matPlate);
    plateMesh.position.y = -0.05;
    this.plateGroup.add(plateMesh);

    // Smooth rounded rim
    const rimGeo = new THREE.TorusGeometry(plateRadius - 0.02, 0.04, 14, 48);
    rimGeo.rotateX(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, this.matPlate);
    rimMesh.position.y = -0.005;
    this.plateGroup.add(rimMesh);

    // Rose gold accent ring
    const goldRimGeo = new THREE.TorusGeometry(plateRadius - 0.12, 0.012, 10, 48);
    goldRimGeo.rotateX(Math.PI / 2);
    const goldRimMesh = new THREE.Mesh(goldRimGeo, this.matGoldRim);
    goldRimMesh.position.y = 0.002;
    this.plateGroup.add(goldRimMesh);
  }

  /**
   * 2. Sponge: Rounded two-tier chocolate cake with ganache ribbon
   */
  private buildSpongeCake() {
    const R = 1.18;
    const layerH = 0.42;

    // Bottom Sponge Tier
    const btmGeo = new THREE.CylinderGeometry(R, R, layerH, 48);
    const btmMesh = new THREE.Mesh(btmGeo, this.matChocolate);
    btmMesh.position.y = layerH / 2;
    this.spongeGroup.add(btmMesh);

    // Bottom bevel
    const btmBevel = new THREE.TorusGeometry(R - 0.035, 0.035, 12, 48);
    btmBevel.rotateX(Math.PI / 2);
    const btmBevelMesh = new THREE.Mesh(btmBevel, this.matChocolate);
    btmBevelMesh.position.y = 0.035;
    this.spongeGroup.add(btmBevelMesh);

    // Middle Chocolate Ganache Filling Ribbon
    const ganacheGeo = new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.08, 48);
    const ganacheMesh = new THREE.Mesh(ganacheGeo, this.matGanache);
    ganacheMesh.position.y = layerH + 0.04;
    this.spongeGroup.add(ganacheMesh);

    // Top Sponge Tier
    const topGeo = new THREE.CylinderGeometry(R, R, layerH, 48);
    const topMesh = new THREE.Mesh(topGeo, this.matChocolate);
    topMesh.position.y = layerH + 0.08 + layerH / 2;
    this.spongeGroup.add(topMesh);
  }

  /**
   * 3. Frosting: Silky smooth whipped cream cap with organic flowing drips
   */
  private buildFrostingAndDrips() {
    const R = 1.18;
    const topCakeY = 0.42 + 0.08 + 0.42; // ~0.92
    const frostR = R + 0.045;

    // Main frosting cap disc
    const capGeo = new THREE.CylinderGeometry(frostR, frostR, 0.16, 48);
    const capMesh = new THREE.Mesh(capGeo, this.matFrosting);
    capMesh.position.y = topCakeY + 0.08;
    this.frostingGroup.add(capMesh);

    // Pillowy rounded top cushion
    const pillowGeo = new THREE.TorusGeometry(frostR - 0.05, 0.065, 18, 48);
    pillowGeo.rotateX(Math.PI / 2);
    const pillowMesh = new THREE.Mesh(pillowGeo, this.matFrosting);
    pillowMesh.position.y = topCakeY + 0.15;
    this.frostingGroup.add(pillowMesh);

    // Skirt ring where frosting meets the side
    const skirtGeo = new THREE.TorusGeometry(frostR - 0.015, 0.045, 12, 48);
    skirtGeo.rotateX(Math.PI / 2);
    const skirtMesh = new THREE.Mesh(skirtGeo, this.matFrosting);
    skirtMesh.position.y = topCakeY - 0.005;
    this.frostingGroup.add(skirtMesh);

    // 16 Organic Flowing Drips around circumference
    const dripDefs = [
      { a: 0.0, l: 0.38, w: 0.075 },
      { a: 0.4, l: 0.18, w: 0.055 },
      { a: 0.78, l: 0.48, w: 0.085 },
      { a: 1.18, l: 0.22, w: 0.058 },
      { a: 1.58, l: 0.42, w: 0.08 },
      { a: 1.98, l: 0.16, w: 0.052 },
      { a: 2.38, l: 0.52, w: 0.09 },
      { a: 2.78, l: 0.24, w: 0.06 },
      { a: 3.18, l: 0.4, w: 0.078 },
      { a: 3.58, l: 0.19, w: 0.055 },
      { a: 3.98, l: 0.46, w: 0.082 },
      { a: 4.38, l: 0.21, w: 0.058 },
      { a: 4.78, l: 0.38, w: 0.075 },
      { a: 5.18, l: 0.17, w: 0.052 },
      { a: 5.58, l: 0.44, w: 0.08 },
      { a: 5.98, l: 0.22, w: 0.058 }
    ];

    const dripStartY = topCakeY - 0.02;

    dripDefs.forEach(d => {
      const cx = Math.cos(d.a) * (frostR - 0.012);
      const cz = Math.sin(d.a) * (frostR - 0.012);

      const dripGroup = new THREE.Group();
      dripGroup.position.set(cx, dripStartY, cz);

      // Smooth tapered cylinder body
      const bodyGeo = new THREE.CylinderGeometry(d.w * 0.82, d.w * 0.42, d.l, 12);
      const bodyMesh = new THREE.Mesh(bodyGeo, this.matFrosting);
      bodyMesh.position.y = -d.l / 2;
      dripGroup.add(bodyMesh);

      // Rounded droplet bulb at bottom
      const bulbGeo = new THREE.SphereGeometry(d.w * 0.92, 12, 12);
      bulbGeo.scale(1, 1.25, 1);
      const bulbMesh = new THREE.Mesh(bulbGeo, this.matFrosting);
      bulbMesh.position.y = -d.l;
      dripGroup.add(bulbMesh);

      // Soft junction blend at top
      const juncGeo = new THREE.SphereGeometry(d.w * 1.05, 10, 10);
      const juncMesh = new THREE.Mesh(juncGeo, this.matFrosting);
      juncMesh.position.y = 0.01;
      dripGroup.add(juncMesh);

      this.frostingGroup.add(dripGroup);
    });
  }

  /**
   * 4. Rosettes: Piped cream dollops & sweet ruby cherries
   */
  private buildDecorations() {
    const topY = 0.42 + 0.08 + 0.42 + 0.16; // ~1.08
    const numRosettes = 8;
    const rosetteRadius = 0.88;

    for (let i = 0; i < numRosettes; i++) {
      const angle = (i / numRosettes) * Math.PI * 2;
      const x = Math.cos(angle) * rosetteRadius;
      const z = Math.sin(angle) * rosetteRadius;

      const rosette = new THREE.Group();
      rosette.position.set(x, topY, z);

      // Piped fluted swirl
      const swirlGeo = new THREE.TorusGeometry(0.08, 0.042, 10, 20);
      swirlGeo.rotateX(Math.PI / 2);
      const swirlMesh = new THREE.Mesh(swirlGeo, this.matFrosting);
      rosette.add(swirlMesh);

      // Cream peak
      const peakGeo = new THREE.ConeGeometry(0.085, 0.14, 14);
      const peakMesh = new THREE.Mesh(peakGeo, this.matFrosting);
      peakMesh.position.y = 0.05;
      rosette.add(peakMesh);

      // Ruby cherry on top
      const berryGeo = new THREE.SphereGeometry(0.055, 12, 12);
      const berryMesh = new THREE.Mesh(berryGeo, this.matBerry);
      berryMesh.position.y = 0.13;
      rosette.add(berryMesh);

      this.decorationsGroup.add(rosette);
    }
  }

  /**
   * 5. Candle: Slender birthday candle with sweet pink spiral accents
   */
  private buildCandle() {
    const candleH = 1.05;
    const candleR = 0.055;
    const topY = 0.42 + 0.08 + 0.42 + 0.16; // ~1.08

    // Candle wax body
    const candleGeo = new THREE.CylinderGeometry(candleR, candleR, candleH, 24);
    const candleMesh = new THREE.Mesh(candleGeo, this.matCandle);
    candleMesh.position.y = topY + candleH / 2;
    this.candleGroup.add(candleMesh);

    // Decorative pastel pink stripes (3 clean rings)
    for (let i = 0; i < 3; i++) {
      const stripeGeo = new THREE.CylinderGeometry(candleR + 0.002, candleR + 0.002, 0.09, 24);
      const stripeMesh = new THREE.Mesh(stripeGeo, this.matCandleStripe);
      stripeMesh.position.y = topY + 0.25 + i * 0.26;
      this.candleGroup.add(stripeMesh);
    }

    // Candle wick
    const wickGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.1, 8);
    const wickMesh = new THREE.Mesh(wickGeo, this.matWick);
    wickMesh.position.y = topY + candleH + 0.05;
    wickMesh.rotation.z = 0.06;
    this.candleGroup.add(wickMesh);

    // Flame & smoke anchor positions
    this.flameGroup.position.set(0, topY + candleH + 0.12, 0);
    this.smokeGroup.position.set(0, topY + candleH + 0.11, 0);
  }

  /**
   * 6. Flame: Multi-tiered organic teardrop flame with additive bloom
   */
  private buildFlame() {
    // Outer flame glow
    const outerGeo = new THREE.SphereGeometry(0.075, 20, 20);
    outerGeo.scale(1, 2.3, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff4800,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flameOuter = new THREE.Mesh(outerGeo, outerMat);
    this.flameOuter.position.y = 0.09;
    this.flameGroup.add(this.flameOuter);

    // Middle golden flame
    const midGeo = new THREE.SphereGeometry(0.052, 20, 20);
    midGeo.scale(1, 2.0, 1);
    const midMat = new THREE.MeshBasicMaterial({
      color: 0xffb800,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flameMid = new THREE.Mesh(midGeo, midMat);
    this.flameMid.position.y = 0.07;
    this.flameGroup.add(this.flameMid);

    // Inner bright white-hot core
    const coreGeo = new THREE.SphereGeometry(0.03, 16, 16);
    coreGeo.scale(0.85, 1.7, 0.85);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.flameCore = new THREE.Mesh(coreGeo, coreMat);
    this.flameCore.position.y = 0.045;
    this.flameGroup.add(this.flameCore);

    this.flameGroup.scale.set(0, 0, 0);
  }

  public resetToInitialState() {
    this.plateGroup.scale.set(0.001, 0.001, 0.001);
    this.spongeGroup.position.y = 6;
    this.frostingGroup.position.y = 7.5;
    this.decorationsGroup.position.y = 8.5;
    this.candleGroup.position.y = 9.5;

    this.flameGroup.scale.set(0, 0, 0);
    this.flameLight.intensity = 0;
    this.isLit = false;
  }

  public playAssemblySequence(callbacks?: CakeAnimationCallbacks) {
    const tl = gsap.timeline({
      onComplete: () => {
        if (callbacks?.onAssemblyComplete) callbacks.onAssemblyComplete();
      }
    });

    // 1. Plate Expands In
    tl.to(
      this.plateGroup.scale,
      {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.65,
        ease: 'back.out(1.6)'
      },
      0
    );

    // 2. Sponge Drops with Organic Bounce
    tl.to(
      this.spongeGroup.position,
      {
        y: 0,
        duration: 0.8,
        ease: 'bounce.out'
      },
      0.55
    );

    // 3. Frosting Drops and Squashes into Place
    tl.to(
      this.frostingGroup.position,
      {
        y: 0,
        duration: 0.72,
        ease: 'back.out(1.2)'
      },
      1.25
    );

    // 4. Cream Rosettes Settle In
    tl.to(
      this.decorationsGroup.position,
      {
        y: 0,
        duration: 0.6,
        ease: 'power2.out'
      },
      1.6
    );

    // 5. Candle Descends
    tl.to(
      this.candleGroup.position,
      {
        y: 0,
        duration: 0.68,
        ease: 'back.out(1.4)'
      },
      1.95
    );

    // 6. Flame Ignition
    tl.add(() => {
      this.igniteFlame();
    }, 2.65);

    return tl;
  }

  public igniteFlame() {
    this.isLit = true;
    gsap.to(this.flameGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.42,
      ease: 'elastic.out(1.2, 0.4)'
    });

    gsap.to(this.flameLight, {
      intensity: 2.2,
      duration: 0.55,
      ease: 'power2.out'
    });
  }

  public extinguishCandle(onComplete?: () => void) {
    this.isLit = false;
    this.windIntensity = 0;

    gsap.killTweensOf(this.flameGroup.scale);
    gsap.killTweensOf(this.flameLight);

    gsap.to(this.flameGroup.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.22,
      ease: 'power3.in'
    });

    gsap.to(this.flameLight, {
      intensity: 0,
      duration: 0.25,
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    this.spawnSmokePuff();
  }

  private spawnSmokePuff() {
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdedede,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    for (let i = 0; i < 22; i++) {
      const size = 0.025 + Math.random() * 0.04;
      const geo = new THREE.SphereGeometry(size, 8, 8);
      const mesh = new THREE.Mesh(geo, smokeMat.clone());

      mesh.position.set(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04
      );

      this.smokeGroup.add(mesh);

      this.smokeParticles.push({
        mesh,
        velX: (Math.random() - 0.5) * 0.014,
        velY: 0.028 + Math.random() * 0.038,
        velZ: (Math.random() - 0.5) * 0.014,
        life: 0,
        maxLife: 42 + Math.random() * 32
      });
    }
  }

  public update(delta: number) {
    this.time += delta;

    if (this.isLit) {
      const flicker1 = Math.sin(this.time * 17.5) * 0.06;
      const flicker2 = Math.cos(this.time * 25.0) * 0.04;
      const flicker3 = Math.sin(this.time * 9.5) * 0.08;

      if (this.windIntensity > 0.02) {
        // Dynamic wind reaction: bends flame sideways, squashes flame height, increases flicker
        const windChaos = (Math.random() - 0.5) * this.windIntensity * 0.45;
        this.flameGroup.rotation.z = this.windIntensity * 0.72 + windChaos;
        this.flameGroup.rotation.x = Math.sin(this.time * 14.0) * 0.12 * this.windIntensity;
        this.flameGroup.scale.x = (1.0 + flicker1) * (1.0 + this.windIntensity * 0.35);
        this.flameGroup.scale.y = Math.max(0.18, (1.0 + flicker3) * (1.0 - this.windIntensity * 0.65));
        this.flameGroup.scale.z = (1.0 + flicker2) * (1.0 - this.windIntensity * 0.25);
        this.flameLight.intensity = Math.max(0.35, (2.0 + Math.sin(this.time * 22) * 0.25) * (1.0 - this.windIntensity * 0.6));
      } else {
        this.flameGroup.scale.x = 1.0 + flicker1;
        this.flameGroup.scale.y = 1.0 + flicker3;
        this.flameGroup.scale.z = 1.0 + flicker2;

        this.flameGroup.rotation.z = Math.sin(this.time * 5.2) * 0.045;
        this.flameGroup.rotation.x = Math.cos(this.time * 4.2) * 0.035;

        this.flameLight.intensity = 2.0 + Math.sin(this.time * 22) * 0.25;
      }
    }

    // Smoke particle update
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life++;

      p.mesh.position.x += p.velX;
      p.mesh.position.y += p.velY;
      p.mesh.position.z += p.velZ;
      p.mesh.scale.multiplyScalar(1.026);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 0.65 * (1 - p.life / p.maxLife));

      if (p.life >= p.maxLife) {
        this.smokeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }
  }
}
