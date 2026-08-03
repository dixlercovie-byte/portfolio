(function () {
  "use strict";

  const WIDTH = 280;
  const HEIGHT = 420;
  const GROUND_H = 28;

  const GRAVITY = 1120.0;
  const FLAP_VELOCITY = -294.0;
  const PIPE_SPEED = 126.0;
  const PIPE_GAP = 112;
  const PIPE_WIDTH = 49;
  const PIPE_SPACING = 182;

  const BIRD_X = 56;
  const BIRD_RADIUS = 10;

  const SKY = "#6ebee6";
  const GREEN = "#3cb446";
  const DARK_GREEN = "#288c32";
  const GROUND_COLOR = "#dcc878";
  const YELLOW = "#ffd228";
  const ORANGE = "#e68c14";
  const WHITE = "#ffffff";
  const BLACK = "#000000";

  class Pipe {
    constructor(x) {
      this.x = x;
      const margin = 42;
      const lo = margin + PIPE_GAP / 2;
      const hi = HEIGHT - GROUND_H - margin - PIPE_GAP / 2;
      this.gapY = lo + Math.random() * (hi - lo);
      this.passed = false;
    }
    update(dt) {
      this.x -= PIPE_SPEED * dt;
    }
    offScreen() {
      return this.x + PIPE_WIDTH < 0;
    }
    topRect() {
      return { x: this.x, y: 0, w: PIPE_WIDTH, h: this.gapY - PIPE_GAP / 2 };
    }
    bottomRect() {
      const topOfBottom = this.gapY + PIPE_GAP / 2;
      return { x: this.x, y: topOfBottom, w: PIPE_WIDTH, h: HEIGHT - GROUND_H - topOfBottom };
    }
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class FlappyGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      canvas.tabIndex = 0;

      this.best = parseInt(localStorage.getItem("portfolio_flappy_best") || "0", 10);
      this.stopped = false;

      this.onKeyDown = this.onKeyDown.bind(this);
      window.addEventListener("keydown", this.onKeyDown);
      canvas.addEventListener("click", () => {
        canvas.focus();
        this.onFlap();
      });

      this.reset();
      canvas.focus();

      this.lastTime = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    reset() {
      this.birdY = HEIGHT / 2;
      this.birdVel = 0;
      this.pipes = [new Pipe(WIDTH + 70)];
      this.score = 0;
      this.state = "READY";
      this.groundScroll = 0;
    }

    onFlap() {
      if (this.paused) return;
      if (this.state === "READY") {
        this.state = "PLAYING";
        this.birdVel = FLAP_VELOCITY;
        if (window.SFX) SFX.jump();
      } else if (this.state === "PLAYING") {
        this.birdVel = FLAP_VELOCITY;
        if (window.SFX) SFX.jump();
      }
    }

    onKeyDown(e) {
      if (document.activeElement !== this.canvas) return;
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        this.onFlap();
      }
      if (this.paused) return;
      if ((e.key === "r" || e.key === "R") && this.state === "DEAD") {
        this.reset();
      }
    }

    die() {
      this.state = "DEAD";
      this.best = Math.max(this.best, this.score);
      localStorage.setItem("portfolio_flappy_best", String(this.best));
      if (window.SFX) SFX.hit();
    }

    update(dt) {
      this.groundScroll = (this.groundScroll + PIPE_SPEED * dt) % 20;
      if (this.state !== "PLAYING") return;

      this.birdVel += GRAVITY * dt;
      this.birdY += this.birdVel * dt;

      for (const p of this.pipes) p.update(dt);
      if (this.pipes[this.pipes.length - 1].x < WIDTH - PIPE_SPACING) {
        this.pipes.push(new Pipe(this.pipes[this.pipes.length - 1].x + PIPE_SPACING));
      }
      this.pipes = this.pipes.filter((p) => !p.offScreen());

      for (const p of this.pipes) {
        if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
          p.passed = true;
          this.score += 1;
          if (window.SFX) SFX.score();
        }
      }

      const birdRect = { x: BIRD_X - BIRD_RADIUS, y: this.birdY - BIRD_RADIUS, w: BIRD_RADIUS * 2, h: BIRD_RADIUS * 2 };
      if (this.birdY - BIRD_RADIUS < 0 || this.birdY + BIRD_RADIUS > HEIGHT - GROUND_H) {
        this.die();
        return;
      }
      for (const p of this.pipes) {
        if (rectsOverlap(birdRect, p.topRect()) || rectsOverlap(birdRect, p.bottomRect())) {
          this.die();
          return;
        }
      }
    }

    drawPipe(rect) {
      const ctx = this.ctx;
      ctx.fillStyle = GREEN;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = DARK_GREEN;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    drawBird() {
      const ctx = this.ctx;
      const angle = Math.max(-30, Math.min(70, -this.birdVel * 0.08)) * (Math.PI / 180);
      ctx.save();
      ctx.translate(BIRD_X, this.birdY);
      ctx.rotate(-angle);
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = ORANGE;
      ctx.beginPath();
      ctx.moveTo(BIRD_RADIUS - 1, 0);
      ctx.lineTo(BIRD_RADIUS + 7, -2);
      ctx.lineTo(BIRD_RADIUS - 1, 3);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(4, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BLACK;
      ctx.beginPath();
      ctx.arc(5, -3, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = SKY;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const p of this.pipes) {
        this.drawPipe(p.topRect());
        this.drawPipe(p.bottomRect());
      }

      ctx.fillStyle = GROUND_COLOR;
      ctx.fillRect(0, HEIGHT - GROUND_H, WIDTH, GROUND_H);
      ctx.strokeStyle = DARK_GREEN;
      ctx.lineWidth = 2;
      for (let x = -20; x < WIDTH + 20; x += 20) {
        const gx = x - this.groundScroll;
        ctx.beginPath();
        ctx.moveTo(gx, HEIGHT - GROUND_H);
        ctx.lineTo(gx + 8, HEIGHT);
        ctx.stroke();
      }

      this.drawBird();

      ctx.textAlign = "center";
      ctx.font = "bold 26px Arial";
      ctx.lineWidth = 3;
      ctx.strokeStyle = BLACK;
      ctx.strokeText(String(this.score), WIDTH / 2, 40);
      ctx.fillStyle = WHITE;
      ctx.fillText(String(this.score), WIDTH / 2, 40);

      if (this.state === "READY") {
        ctx.fillStyle = BLACK;
        ctx.font = "13px Arial";
        ctx.fillText("Click or press Space to flap", WIDTH / 2, HEIGHT / 2);
      } else if (this.state === "DEAD") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, HEIGHT / 2 - 60, WIDTH, 120);
        ctx.fillStyle = WHITE;
        ctx.font = "bold 22px Arial";
        ctx.fillText("Game Over", WIDTH / 2, HEIGHT / 2 - 34);
        ctx.font = "14px Arial";
        ctx.fillText(`Best: ${this.best}`, WIDTH / 2, HEIGHT / 2);
        ctx.fillText("Press R to try again", WIDTH / 2, HEIGHT / 2 + 30);
      }
    }

    loop(now) {
      if (this.stopped) return;
      if (!this.paused) {
        const dt = Math.min(0.05, (now - this.lastTime) / 1000);
        this.lastTime = now;
        this.update(dt);
        this.draw();
      }
      requestAnimationFrame(this.loop);
    }

    pause() {
      this.paused = true;
    }

    resume() {
      this.paused = false;
      this.lastTime = performance.now();
    }

    stop() {
      this.stopped = true;
      window.removeEventListener("keydown", this.onKeyDown);
    }
  }

  window.startFlappyGame = function (canvas) {
    return new FlappyGame(canvas);
  };
})();
