(function () {
  "use strict";

  const WIDTH = 300;
  const HEIGHT = 375;
  const HUD_H = 25;

  const PADDLE_W = 56;
  const PADDLE_H = 9;
  const PADDLE_SPEED = 300.0;
  const PADDLE_Y = HEIGHT - 25;

  const BALL_RADIUS = 5;
  const BALL_SPEED = 200.0;

  const BRICK_ROWS = 6;
  const BRICK_COLS = 8;
  const BRICK_H = 14;
  const BRICK_PAD = 3;
  const BRICK_TOP = HUD_H + 25;
  const BRICK_COLORS = [
    "#dc3c3c", "#e68228", "#e6c828", "#64c850", "#3ca0dc", "#8c64dc",
  ];

  const BLACK = "#0a0a0f";
  const WHITE = "#ffffff";
  const PADDLE_COLOR = "#e6e6e6";
  const BALL_COLOR = "#ffffff";

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function ballRect(ball) {
    return { x: ball.x - BALL_RADIUS, y: ball.y - BALL_RADIUS, w: BALL_RADIUS * 2, h: BALL_RADIUS * 2 };
  }

  function reflect(ball, rect) {
    const br = ballRect(ball);
    const overlapLeft = br.x + br.w - rect.x;
    const overlapRight = rect.x + rect.w - br.x;
    const overlapTop = br.y + br.h - rect.y;
    const overlapBottom = rect.y + rect.h - br.y;
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }
  }

  function makeBricks() {
    const bricks = [];
    const brickW = (WIDTH - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS;
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const x = BRICK_PAD + col * (brickW + BRICK_PAD);
        const y = BRICK_TOP + row * (BRICK_H + BRICK_PAD);
        bricks.push({ x, y, w: brickW, h: BRICK_H, color: BRICK_COLORS[row % BRICK_COLORS.length] });
      }
    }
    return bricks;
  }

  class BreakoutGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      canvas.tabIndex = 0;

      this.keysDown = {};
      this.stopped = false;

      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
      canvas.addEventListener("click", () => canvas.focus());

      this.reset();
      canvas.focus();

      this.lastTime = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    reset() {
      this.paddleX = WIDTH / 2 - PADDLE_W / 2;
      this.ball = { x: 0, y: 0, vx: 0, vy: 0 };
      this.resetBall();
      this.bricks = makeBricks();
      this.score = 0;
      this.lives = 3;
      this.state = "READY";
    }

    resetBall() {
      this.ball.x = this.paddleX + PADDLE_W / 2;
      this.ball.y = PADDLE_Y - BALL_RADIUS - 1;
      const angleChoices = [-0.6, -0.3, 0.3, 0.6];
      const vx = BALL_SPEED * angleChoices[Math.floor(Math.random() * angleChoices.length)];
      const vy = -Math.sqrt(BALL_SPEED * BALL_SPEED - vx * vx);
      this.ball.vx = vx;
      this.ball.vy = vy;
    }

    onKeyDown(e) {
      if (document.activeElement !== this.canvas) return;
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D", " "].includes(e.key)) {
        e.preventDefault();
      }
      this.keysDown[e.key] = true;
      if (e.key === " " && this.state === "READY") {
        this.state = "PLAYING";
        if (window.SFX) SFX.launch();
      }
      if ((e.key === "r" || e.key === "R") && (this.state === "WIN" || this.state === "GAMEOVER")) {
        this.reset();
      }
    }

    onKeyUp(e) {
      if (document.activeElement !== this.canvas) return;
      this.keysDown[e.key] = false;
    }

    updatePaddle(dt) {
      const left = this.keysDown["ArrowLeft"] || this.keysDown["a"] || this.keysDown["A"];
      const right = this.keysDown["ArrowRight"] || this.keysDown["d"] || this.keysDown["D"];
      if (left) this.paddleX -= PADDLE_SPEED * dt;
      if (right) this.paddleX += PADDLE_SPEED * dt;
      this.paddleX = Math.max(0, Math.min(WIDTH - PADDLE_W, this.paddleX));
    }

    update(dt) {
      this.updatePaddle(dt);

      if (this.state === "READY") {
        this.ball.x = this.paddleX + PADDLE_W / 2;
        this.ball.y = PADDLE_Y - BALL_RADIUS - 1;
        return;
      }
      if (this.state !== "PLAYING") return;

      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;

      if (this.ball.x - BALL_RADIUS < 0) {
        this.ball.x = BALL_RADIUS;
        this.ball.vx = -this.ball.vx;
        if (window.SFX) SFX.bounce();
      }
      if (this.ball.x + BALL_RADIUS > WIDTH) {
        this.ball.x = WIDTH - BALL_RADIUS;
        this.ball.vx = -this.ball.vx;
        if (window.SFX) SFX.bounce();
      }
      if (this.ball.y - BALL_RADIUS < HUD_H) {
        this.ball.y = HUD_H + BALL_RADIUS;
        this.ball.vy = -this.ball.vy;
        if (window.SFX) SFX.bounce();
      }

      if (this.ball.y + BALL_RADIUS > HEIGHT) {
        this.lives -= 1;
        if (this.lives <= 0) {
          this.state = "GAMEOVER";
          if (window.SFX) SFX.gameOver();
        } else {
          this.state = "READY";
          this.resetBall();
          if (window.SFX) SFX.hit();
        }
        return;
      }

      const paddleRect = { x: this.paddleX, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
      if (this.ball.vy > 0 && rectsOverlap(ballRect(this.ball), paddleRect)) {
        this.ball.y = paddleRect.y - BALL_RADIUS;
        const paddleCenter = paddleRect.x + PADDLE_W / 2;
        let hitPos = (this.ball.x - paddleCenter) / (PADDLE_W / 2);
        hitPos = Math.max(-1, Math.min(1, hitPos));
        const angleVx = BALL_SPEED * 0.75 * hitPos;
        this.ball.vx = angleVx;
        this.ball.vy = -Math.sqrt(BALL_SPEED * BALL_SPEED - angleVx * angleVx);
        if (window.SFX) SFX.bounce();
      }

      for (let i = 0; i < this.bricks.length; i++) {
        const brick = this.bricks[i];
        if (rectsOverlap(ballRect(this.ball), brick)) {
          reflect(this.ball, brick);
          this.bricks.splice(i, 1);
          this.score += 10;
          if (window.SFX) SFX.brick();
          break;
        }
      }

      if (this.bricks.length === 0) {
        this.state = "WIN";
        if (window.SFX) SFX.win();
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const brick of this.bricks) {
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      }

      ctx.fillStyle = PADDLE_COLOR;
      ctx.beginPath();
      ctx.roundRect(this.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 3);
      ctx.fill();

      ctx.fillStyle = BALL_COLOR;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = WHITE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, HUD_H);
      ctx.lineTo(WIDTH, HUD_H);
      ctx.stroke();

      ctx.fillStyle = WHITE;
      ctx.font = "12px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${this.score}`, 6, HUD_H / 2);
      ctx.textAlign = "right";
      ctx.fillText(`Lives: ${this.lives}`, WIDTH - 6, HUD_H / 2);

      if (this.state === "READY") {
        ctx.textAlign = "center";
        ctx.font = "12px Arial";
        ctx.fillText("Press Space to launch", WIDTH / 2, HEIGHT / 2);
      } else if (this.state === "WIN" || this.state === "GAMEOVER") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, HEIGHT / 2 - 34, WIDTH, 68);
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.font = "bold 20px Arial";
        ctx.fillText(this.state === "WIN" ? "YOU WIN!" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 12);
        ctx.font = "12px Arial";
        ctx.fillText("Press R to play again", WIDTH / 2, HEIGHT / 2 + 14);
      }
    }

    loop(now) {
      if (this.stopped) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    }

    stop() {
      this.stopped = true;
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
    }
  }

  window.startBreakoutGame = function (canvas) {
    return new BreakoutGame(canvas);
  };
})();
