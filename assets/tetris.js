(function () {
  "use strict";

  const CELL = 16;
  const COLS = 10;
  const ROWS = 20;
  const HUD_H = 28;
  const WIDTH = COLS * CELL;
  const HEIGHT = ROWS * CELL + HUD_H;

  const DAS_DELAY = 0.17;
  const ARR = 0.05;

  const BLACK = "#0a0a0f";
  const WHITE = "#ffffff";
  const GRID_COLOR = "#1c1c26";

  const PIECE_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
  const COLORS = {
    I: "#3cd6dc",
    O: "#e6c828",
    T: "#a05ce6",
    S: "#50c850",
    Z: "#e64c4c",
    J: "#4c78e6",
    L: "#e68c28",
  };

  // Each piece: 4 rotation states, each a list of 4 [x, y] cells within a 4x4 box.
  const SHAPES = {
    I: [
      [[0, 1], [1, 1], [2, 1], [3, 1]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[1, 0], [1, 1], [1, 2], [1, 3]],
    ],
    O: [
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [2, 1]],
    ],
    T: [
      [[1, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [1, 2]],
      [[1, 0], [0, 1], [1, 1], [1, 2]],
    ],
    S: [
      [[1, 0], [2, 0], [0, 1], [1, 1]],
      [[1, 0], [1, 1], [2, 1], [2, 2]],
      [[1, 1], [2, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
    ],
    Z: [
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[2, 0], [1, 1], [2, 1], [1, 2]],
      [[0, 1], [1, 1], [1, 2], [2, 2]],
      [[1, 0], [0, 1], [1, 1], [0, 2]],
    ],
    J: [
      [[0, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [2, 0], [1, 1], [1, 2]],
      [[0, 1], [1, 1], [2, 1], [2, 2]],
      [[1, 0], [1, 1], [0, 2], [1, 2]],
    ],
    L: [
      [[2, 0], [0, 1], [1, 1], [2, 1]],
      [[1, 0], [1, 1], [1, 2], [2, 2]],
      [[0, 1], [1, 1], [2, 1], [0, 2]],
      [[0, 0], [1, 0], [1, 1], [1, 2]],
    ],
  };

  function newBag() {
    const bag = PIECE_TYPES.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  function makeBoard() {
    const rows = [];
    for (let r = 0; r < ROWS; r++) rows.push(new Array(COLS).fill(null));
    return rows;
  }

  function pieceCells(type, rotation) {
    return SHAPES[type][rotation];
  }

  function collides(board, type, rotation, offX, offY) {
    const cells = pieceCells(type, rotation);
    for (const [cx, cy] of cells) {
      const x = offX + cx;
      const y = offY + cy;
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y < 0) continue;
      if (board[y][x]) return true;
    }
    return false;
  }

  class TetrisGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      canvas.tabIndex = 0;

      this.keysDown = {};
      this.das = { left: 0, right: 0 };
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
      this.board = makeBoard();
      this.bag = newBag();
      this.nextType = this.bag.pop();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.dropInterval = 0.8;
      this.dropTimer = 0;
      this.state = "PLAYING";
      this.spawnPiece();
    }

    takeFromBag() {
      if (this.bag.length === 0) this.bag = newBag();
      return this.bag.pop();
    }

    spawnPiece() {
      const type = this.nextType;
      this.nextType = this.takeFromBag();
      this.piece = { type: type, rotation: 0, x: 3, y: -1 };
      if (collides(this.board, type, 0, this.piece.x, this.piece.y)) {
        this.state = "GAMEOVER";
        if (window.SFX) SFX.gameOver();
      }
    }

    onKeyDown(e) {
      if (document.activeElement !== this.canvas) return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " "];
      if (keys.includes(e.key)) e.preventDefault();

      if ((e.key === "r" || e.key === "R") && this.state === "GAMEOVER") {
        this.reset();
        return;
      }
      if (this.state !== "PLAYING") return;

      if (e.repeat) return;
      if (e.key === "ArrowLeft") {
        this.keysDown.left = true;
        this.das.left = 0;
        this.tryMove(-1, 0);
      } else if (e.key === "ArrowRight") {
        this.keysDown.right = true;
        this.das.right = 0;
        this.tryMove(1, 0);
      } else if (e.key === "ArrowDown") {
        this.keysDown.down = true;
      } else if (e.key === "ArrowUp") {
        this.rotate();
      } else if (e.key === " ") {
        this.hardDrop();
      }
    }

    onKeyUp(e) {
      if (e.key === "ArrowLeft") this.keysDown.left = false;
      if (e.key === "ArrowRight") this.keysDown.right = false;
      if (e.key === "ArrowDown") this.keysDown.down = false;
    }

    tryMove(dx, dy) {
      const p = this.piece;
      if (!collides(this.board, p.type, p.rotation, p.x + dx, p.y + dy)) {
        p.x += dx;
        p.y += dy;
        return true;
      }
      return false;
    }

    rotate() {
      const p = this.piece;
      const newRotation = (p.rotation + 1) % 4;
      const kicks = [0, -1, 1, -2, 2];
      for (const k of kicks) {
        if (!collides(this.board, p.type, newRotation, p.x + k, p.y)) {
          p.rotation = newRotation;
          p.x += k;
          if (window.SFX) SFX.turn();
          return;
        }
      }
    }

    hardDrop() {
      const p = this.piece;
      let dist = 0;
      while (!collides(this.board, p.type, p.rotation, p.x, p.y + 1)) {
        p.y += 1;
        dist += 1;
      }
      this.score += dist * 2;
      this.lockPiece();
    }

    lockPiece() {
      const p = this.piece;
      const cells = pieceCells(p.type, p.rotation);
      for (const [cx, cy] of cells) {
        const x = p.x + cx;
        const y = p.y + cy;
        if (y >= 0) this.board[y][x] = COLORS[p.type];
      }
      if (window.SFX) SFX.bounce();
      this.clearLines();
      this.spawnPiece();
      this.dropTimer = 0;
    }

    clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.board[r].every((cell) => cell !== null)) {
          this.board.splice(r, 1);
          this.board.unshift(new Array(COLS).fill(null));
          cleared += 1;
          r += 1;
        }
      }
      if (cleared > 0) {
        const points = [0, 100, 300, 500, 800][cleared] * this.level;
        this.score += points;
        this.lines += cleared;
        this.level = 1 + Math.floor(this.lines / 10);
        this.dropInterval = Math.max(0.1, 0.8 - (this.level - 1) * 0.06);
        if (window.SFX) {
          if (cleared >= 4) SFX.powerup();
          else SFX.score();
        }
      }
    }

    update(dt) {
      if (this.state !== "PLAYING") return;

      if (this.keysDown.left) {
        this.das.left += dt;
        if (this.das.left >= DAS_DELAY) {
          this.das.left -= ARR;
          this.tryMove(-1, 0);
        }
      }
      if (this.keysDown.right) {
        this.das.right += dt;
        if (this.das.right >= DAS_DELAY) {
          this.das.right -= ARR;
          this.tryMove(1, 0);
        }
      }

      const interval = this.keysDown.down ? Math.min(this.dropInterval, 0.05) : this.dropInterval;
      this.dropTimer += dt;
      if (this.dropTimer >= interval) {
        this.dropTimer -= interval;
        if (!this.tryMove(0, 1)) {
          this.lockPiece();
        }
      }
    }

    drawCell(x, y, color) {
      const ctx = this.ctx;
      const px = x * CELL;
      const py = y * CELL + HUD_H;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(px + 1, py + 1, CELL - 2, 3);
    }

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, HUD_H);
        ctx.lineTo(c * CELL, HEIGHT);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL + HUD_H);
        ctx.lineTo(WIDTH, r * CELL + HUD_H);
        ctx.stroke();
      }

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.board[r][c]) this.drawCell(c, r, this.board[r][c]);
        }
      }

      if (this.state === "PLAYING" || this.state === "GAMEOVER") {
        const p = this.piece;
        if (p) {
          const cells = pieceCells(p.type, p.rotation);
          for (const [cx, cy] of cells) {
            const gy = p.y + cy;
            if (gy >= 0) this.drawCell(p.x + cx, gy, COLORS[p.type]);
          }
        }
      }

      ctx.fillStyle = WHITE;
      ctx.font = "11px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${this.score}`, 4, HUD_H / 2);
      ctx.textAlign = "right";
      ctx.fillText(`Lv ${this.level}`, WIDTH - 4, HUD_H / 2);

      if (this.state === "GAMEOVER") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, HEIGHT / 2 - 34, WIDTH, 68);
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.font = "bold 16px Arial";
        ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2 - 12);
        ctx.font = "11px Arial";
        ctx.fillText("Press R to play again", WIDTH / 2, HEIGHT / 2 + 12);
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

  window.startTetrisGame = function (canvas) {
    return new TetrisGame(canvas);
  };
})();
