/**
 * Magic Cursor & Touch Sparkle Trail
 * Renders lightweight twinkling gold and white particles following pointer movement.
 */
interface SparkleParticle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  life: number;
}

export class MagicCursor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: SparkleParticle[] = [];
  private animId: number | null = null;
  private readonly colors = [
    'rgba(255, 255, 255, 0.85)',
    'rgba(255, 223, 0, 0.7)',
    'rgba(255, 250, 205, 0.75)'
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.bindEvents();
    this.start();
  }

  private resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private spawnAt(x: number, y: number) {
    if (Math.random() > 0.35) {
      this.particles.push({
        x,
        y,
        size: Math.random() * 2.2 + 1.5,
        speedX: Math.random() - 0.5,
        speedY: Math.random() - 0.5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: 100
      });
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', (e) => {
      this.spawnAt(e.clientX, e.clientY);
    });
    window.addEventListener(
      'touchmove',
      (e) => {
        const t = e.touches[0];
        if (t) this.spawnAt(t.clientX, t.clientY);
      },
      { passive: true }
    );
  }

  private start() {
    const animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life -= 3;
        if (p.size > 0.05) p.size -= 0.05;

        if (p.life <= 0 || p.size <= 0.1) {
          this.particles.splice(i, 1);
          i--;
          continue;
        }

        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.animId = requestAnimationFrame(animate);
    };

    this.animId = requestAnimationFrame(animate);
  }

  public destroy() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    window.removeEventListener('resize', this.resize);
  }
}
