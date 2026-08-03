(function () {
  "use strict";

  const CELL = 15;
  const COLS = 20;
  const ROWS = 20;
  const HUD_H = 28;
  const START_INTERVAL = 0.14;
  const MIN_INTERVAL = 0.06;
  const SPEEDUP = 0.003;

  const BOARD_LIGHT = "#aad751";
  const BOARD_DARK = "#a2d149";
  const SNAKE_HEAD = "#4e7cf6";
  const SNAKE_BODY = "#6291fa";
  const SNAKE_OUTLINE = "#3c64d2";
  const FOOD_COLOR = "#dc3228";
  const FOOD_OUTLINE = "#961414";
  const LEAF_COLOR = "#3ca03c";
  const WHITE = "#ffffff";
  const BLACK = "#000000";

  const KEY_DIRS = {
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  };

  function opposite(d) {
    return [-d[0], -d[1]];
  }

  class SnakeGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      canvas.width = COLS * CELL;
      canvas.height = ROWS * CELL + HUD_H;
      canvas.tabIndex = 0;

      this.highScore = parseInt(localStorage.getItem("portfolio_snake_high_score") || "0", 10);
      this.stopped = false;

      this.onKeyDown = this.onKeyDown.bind(this);
      window.addEventListener("keydown", this.onKeyDown);
      canvas.addEventListener("click", () => canvas.focus());

      this.reset();
      canvas.focus();

      this.lastTime = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    reset() {
      const startCol = Math.floor(COLS / 2);
      const startRow = Math.floor(ROWS / 2);
      this.snake = [[startCol - 1, startRow], [startCol - 2, startRow], [startCol - 3, startRow]];
      this.prevSnake = this.snake.map((s) => s.slice());
      this.direction = [1, 0];
      this.nextDirection = [1, 0];
      this.food = this.spawnFood();
      this.score = 0;
      this.moveInterval = START_INTERVAL;
      this.moveTimer = 0;
      this.state = "PLAYING";
    }

    spawnFood() {
      const empty = [];
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (!this.snake.some((s) => s[0] === c && s[1] === r)) empty.push([c, r]);
        }
      }
      return empty[Math.floor(Math.random() * empty.length)];
    }

    onKeyDown(e) {
      if (document.activeElement !== this.canvas) return;
      if (this.paused) return;

      if (e.key === "r" || e.key === "R") {
        if (this.state === "GAMEOVER") this.reset();
        return;
      }
      const nd = KEY_DIRS[e.key];
      if (nd) {
        e.preventDefault();
        const opp = opposite(this.direction);
        if (!(nd[0] === opp[0] && nd[1] === opp[1])) {
          this.nextDirection = nd;
        }
      }
    }

    step() {
      this.prevSnake = this.snake.map((s) => s.slice());
      this.direction = this.nextDirection;
      const [hc, hr] = this.snake[0];
      const [dx, dy] = this.direction;
      const newHead = [hc + dx, hr + dy];

      if (newHead[0] < 0 || newHead[0] >= COLS || newHead[1] < 0 || newHead[1] >= ROWS) {
        this.state = "GAMEOVER";
        if (window.SFX) SFX.hit();
        return;
      }
      const wouldGrow = newHead[0] === this.food[0] && newHead[1] === this.food[1];
      const checkBody = wouldGrow ? this.snake : this.snake.slice(0, -1);
      if (checkBody.some((s) => s[0] === newHead[0] && s[1] === newHead[1])) {
        this.state = "GAMEOVER";
        if (window.SFX) SFX.hit();
        return;
      }

      this.snake.unshift(newHead);
      if (wouldGrow) {
        this.score += 10;
        if (window.SFX) SFX.eat();
        if (this.score > this.highScore) {
          this.highScore = this.score;
          localStorage.setItem("portfolio_snake_high_score", String(this.highScore));
        }
        this.moveInterval = Math.max(MIN_INTERVAL, this.moveInterval - SPEEDUP);
        this.food = this.spawnFood();
      } else {
        this.snake.pop();
      }
    }

    update(dt) {
      if (this.state !== "PLAYING") return;
      this.moveTimer += dt;
      if (this.moveTimer >= this.moveInterval) {
        this.moveTimer -= this.moveInterval;
        this.step();
      }
    }

    interpolatedPoints() {
      let t = 0;
      if (this.moveInterval > 0) {
        t = Math.max(0, Math.min(1, this.moveTimer / this.moveInterval));
      }
      return this.snake.map((seg, i) => {
        let pc, pr;
        if (i < this.prevSnake.length) {
          [pc, pr] = this.prevSnake[i];
        } else {
          [pc, pr] = seg;
        }
        const [c, r] = seg;
        const ix = pc + (c - pc) * t;
        const iy = pr + (r - pr) * t;
        return [ix * CELL + CELL / 2, iy * CELL + HUD_H + CELL / 2];
      });
    }

    drawBoard() {
      const ctx = this.ctx;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? BOARD_LIGHT : BOARD_DARK;
          ctx.fillRect(c * CELL, r * CELL + HUD_H, CELL, CELL);
        }
      }
    }

    drawSnake(points) {
      const ctx = this.ctx;
      const thickness = CELL - 3;
      const outline = CELL - 0.5;

      ctx.lineCap = "round";
      ctx.strokeStyle = SNAKE_OUTLINE;
      ctx.lineWidth = outline;
      for (let i = 0; i < points.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(points[i][0], points[i][1]);
        ctx.lineTo(points[i + 1][0], points[i + 1][1]);
        ctx.stroke();
      }

      ctx.strokeStyle = SNAKE_BODY;
      ctx.lineWidth = thickness;
      for (let i = 0; i < points.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(points[i][0], points[i][1]);
        ctx.lineTo(points[i + 1][0], points[i + 1][1]);
        ctx.stroke();
      }

      if (points.length >= 2) {
        const tail = points[points.length - 1];
        ctx.fillStyle = SNAKE_BODY;
        ctx.beginPath();
        ctx.arc(tail[0], tail[1], thickness / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const head = points[0];
      ctx.fillStyle = SNAKE_HEAD;
      ctx.beginPath();
      ctx.arc(head[0], head[1], thickness / 2 + 1.5, 0, Math.PI * 2);
      ctx.fill();
      this.drawEyes(head);
    }

    drawEyes(headPos) {
      const ctx = this.ctx;
      const [dx, dy] = this.direction;
      const px = -dy;
      const py = dx;
      const [hx, hy] = headPos;
      for (const side of [1, -1]) {
        const ex = hx + px * 4 * side + dx * 3;
        const ey = hy + py * 4 * side + dy * 3;
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(ex + dx, ey + dy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawFood() {
      const ctx = this.ctx;
      const [fx, fy] = this.food;
      const cx = fx * CELL + CELL / 2;
      const cy = fy * CELL + HUD_H + CELL / 2;
      const r = CELL / 2 - 2;
      ctx.fillStyle = FOOD_COLOR;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = FOOD_OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = "#5a3c14";
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + 2, cy - r - 4);
      ctx.stroke();
      ctx.fillStyle = LEAF_COLOR;
      ctx.beginPath();
      ctx.ellipse(cx + 3, cy - r - 5, 4, 2.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = "#0f0f14";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBoard();
      this.drawFood();
      this.drawSnake(this.interpolatedPoints());

      ctx.fillStyle = WHITE;
      ctx.font = "13px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${this.score}`, 6, HUD_H / 2);
      ctx.textAlign = "right";
      ctx.fillText(`High: ${this.highScore}`, this.canvas.width - 6, HUD_H / 2);

      if (this.state === "GAMEOVER") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, this.canvas.height / 2 - 34, this.canvas.width, 68);
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.font = "bold 20px Arial";
        ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2 - 14);
        if (this.score > 0 && this.score === this.highScore) {
          ctx.fillStyle = "#ffd73c";
          ctx.font = "12px Arial";
          ctx.fillText("New high score!", this.canvas.width / 2, this.canvas.height / 2 + 6);
        }
        ctx.fillStyle = WHITE;
        ctx.font = "12px Arial";
        ctx.fillText("Press R to play again", this.canvas.width / 2, this.canvas.height / 2 + 22);
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

  window.startSnakeGame = function (canvas) {
    return new SnakeGame(canvas);
  };
})();
