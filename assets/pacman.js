(function () {
  "use strict";

  const CELL = 13;
  const MAZE_COLS = 10;
  const MAZE_ROWS = 10;
  const GRID_W = 2 * MAZE_COLS + 1;
  const GRID_H = 2 * MAZE_ROWS + 1;
  const HUD_H = 24;
  const WIDTH = GRID_W * CELL;
  const HEIGHT = GRID_H * CELL + HUD_H;

  const PLAYER_SPEED = 3.5;
  const GHOST_SPEED = 2.8;
  const FRIGHT_SPEED = 1.8;
  const FRIGHT_TIME = 6.0;

  const BLUE = "#1e1ec8";
  const YELLOW = "#ffff00";
  const WHITE = "#ffffff";
  const RED = "#dc2828";
  const PINK = "#ff82c8";
  const FRIGHT_COLOR = "#2828dc";
  const DOT_COLOR = "#ffdc96";

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function dirEq(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }
  function oppositeDir(d) {
    return [-d[0], -d[1]];
  }
  function key(c, r) {
    return c + "," + r;
  }

  function generateMaze() {
    const walls = [];
    for (let r = 0; r < GRID_H; r++) walls.push(new Array(GRID_W).fill(true));
    const visited = [];
    for (let r = 0; r < MAZE_ROWS; r++) visited.push(new Array(MAZE_COLS).fill(false));

    function carve(cx, cy) {
      const stack = [[cx, cy]];
      visited[cy][cx] = true;
      walls[2 * cy + 1][2 * cx + 1] = false;
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const options = [];
        for (const [dx, dy] of DIRS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < MAZE_COLS && ny >= 0 && ny < MAZE_ROWS && !visited[ny][nx]) {
            options.push([nx, ny, dx, dy]);
          }
        }
        if (options.length === 0) {
          stack.pop();
          continue;
        }
        const [nx, ny, dx, dy] = options[Math.floor(Math.random() * options.length)];
        walls[2 * y + 1 + dy][2 * x + 1 + dx] = false;
        walls[2 * ny + 1][2 * nx + 1] = false;
        visited[ny][nx] = true;
        stack.push([nx, ny]);
      }
    }

    carve(0, 0);

    for (let cy = 0; cy < MAZE_ROWS; cy++) {
      for (let cx = 0; cx < MAZE_COLS - 1; cx++) {
        const r = 2 * cy + 1;
        const c = 2 * cx + 2;
        if (walls[r][c] && Math.random() < 0.15) walls[r][c] = false;
      }
    }
    for (let cy = 0; cy < MAZE_ROWS - 1; cy++) {
      for (let cx = 0; cx < MAZE_COLS; cx++) {
        const r = 2 * cy + 2;
        const c = 2 * cx + 1;
        if (walls[r][c] && Math.random() < 0.15) walls[r][c] = false;
      }
    }

    return walls;
  }

  function isOpen(walls, col, row) {
    if (col < 0 || col >= GRID_W || row < 0 || row >= GRID_H) return false;
    return !walls[row][col];
  }

  function openNeighbors(walls, col, row, excludeDir) {
    const options = [];
    for (const d of DIRS) {
      if (excludeDir && dirEq(d, oppositeDir(excludeDir))) continue;
      if (isOpen(walls, col + d[0], row + d[1])) options.push(d);
    }
    if (options.length === 0 && excludeDir) {
      const rev = oppositeDir(excludeDir);
      if (isOpen(walls, col + rev[0], row + rev[1])) options.push(rev);
    }
    return options;
  }

  class Entity {
    constructor(col, row, speed) {
      this.start = [col, row];
      this.cell = [col, row];
      this.dir = [0, 0];
      this.nextDir = [0, 0];
      this.progress = 0.0;
      this.speed = speed;
    }
    pos() {
      return [this.cell[0] + this.dir[0] * this.progress, this.cell[1] + this.dir[1] * this.progress];
    }
    reset() {
      this.cell = this.start.slice();
      this.dir = [0, 0];
      this.nextDir = [0, 0];
      this.progress = 0.0;
    }
  }

  class Ghost extends Entity {
    constructor(col, row, speed, color, behavior) {
      super(col, row, speed);
      this.color = color;
      this.behavior = behavior;
      this.frightened = false;
      this.frightTimer = 0;
    }
  }

  function advance(entity, dt, decideDir, onArrive) {
    let remaining = entity.speed * dt;
    if (dirEq(entity.dir, [0, 0])) entity.dir = decideDir(entity);
    while (remaining > 1e-9 && !dirEq(entity.dir, [0, 0])) {
      const distLeft = 1.0 - entity.progress;
      const step = Math.min(remaining, distLeft);
      entity.progress += step;
      remaining -= step;
      if (entity.progress >= 1.0 - 1e-9) {
        entity.cell[0] += entity.dir[0];
        entity.cell[1] += entity.dir[1];
        entity.progress = 0.0;
        if (onArrive) onArrive(entity.cell.slice());
        entity.dir = decideDir(entity);
      }
    }
  }

  function choosePlayerDir(player, walls) {
    const [col, row] = player.cell;
    if (!dirEq(player.nextDir, [0, 0]) && isOpen(walls, col + player.nextDir[0], row + player.nextDir[1])) {
      return player.nextDir;
    }
    if (!dirEq(player.dir, [0, 0]) && isOpen(walls, col + player.dir[0], row + player.dir[1])) {
      return player.dir;
    }
    return [0, 0];
  }

  function chooseGhostDir(ghost, walls, player) {
    const [col, row] = ghost.cell;
    const options = openNeighbors(walls, col, row, dirEq(ghost.dir, [0, 0]) ? null : ghost.dir);
    if (options.length === 0) return [0, 0];
    if (ghost.frightened) return options[Math.floor(Math.random() * options.length)];
    if (ghost.behavior === "chase") {
      const [pcol, prow] = player.cell;
      let best = null;
      let bestDist = null;
      for (const d of options) {
        const nc = col + d[0];
        const nr = row + d[1];
        const dist = (nc - pcol) ** 2 + (nr - prow) ** 2;
        if (bestDist === null || dist < bestDist) {
          bestDist = dist;
          best = d;
        }
      }
      return best;
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  function drawPacman(ctx, cx, cy, radius, facingRad, mouthRad, color) {
    ctx.fillStyle = color;
    if (mouthRad < 0.03) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, facingRad + mouthRad, facingRad - mouthRad + Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(ctx, cx, cy, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy - 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - radius, cy - 2, radius * 2, radius + 6);
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius + 4);
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const x = cx - radius + (i * (radius * 2)) / n;
      const y = i % 2 === 0 ? cy + radius + 4 : cy + radius - 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + radius, cy + radius + 4);
    ctx.closePath();
    ctx.fill();
    const eyeR = Math.max(2, Math.floor(radius / 3));
    ctx.fillStyle = WHITE;
    ctx.beginPath();
    ctx.arc(cx - radius / 2, cy - 4, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + radius / 2, cy - 4, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000050";
    const pupilR = Math.max(1, Math.floor(eyeR / 2));
    ctx.beginPath();
    ctx.arc(cx - radius / 2, cy - 4, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + radius / 2, cy - 4, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }

  const DIR_TO_ANGLE = {
    "1,0": 0,
    "-1,0": Math.PI,
    "0,-1": -Math.PI / 2,
    "0,1": Math.PI / 2,
    "0,0": 0,
  };

  class PacmanGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      canvas.tabIndex = 0;

      this.facing = [1, 0];
      this.stopped = false;

      this.onKeyDown = this.onKeyDown.bind(this);
      window.addEventListener("keydown", this.onKeyDown);
      canvas.addEventListener("click", () => canvas.focus());

      this.resetGame();
      canvas.focus();

      this.lastTime = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }

    resetGame() {
      this.walls = generateMaze();
      this.player = new Entity(1, 1, PLAYER_SPEED);
      this.ghosts = [
        new Ghost(GRID_W - 2, GRID_H - 2, GHOST_SPEED, RED, "chase"),
        new Ghost(GRID_W - 2, 1, GHOST_SPEED, PINK, "wander"),
      ];
      this.dots = new Set();
      for (let row = 0; row < GRID_H; row++) {
        for (let col = 0; col < GRID_W; col++) {
          if (!this.walls[row][col]) this.dots.add(key(col, row));
        }
      }
      this.dots.delete(key(1, 1));
      this.pellets = new Set();
      for (const [c, r] of [[GRID_W - 2, 1], [1, GRID_H - 2]]) {
        if (this.dots.has(key(c, r))) {
          this.dots.delete(key(c, r));
          this.pellets.add(key(c, r));
        }
      }
      for (const g of this.ghosts) this.dots.delete(key(g.cell[0], g.cell[1]));
      this.score = 0;
      this.lives = 3;
      this.state = "PLAYING";
    }

    onKeyDown(e) {
      if (document.activeElement !== this.canvas) return;
      const moveKeys = {
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
      };
      if (moveKeys[e.key]) e.preventDefault();
      if (this.paused) return;
      if ((e.key === "r" || e.key === "R") && this.state !== "PLAYING") {
        this.resetGame();
        return;
      }
      if (this.state === "PLAYING" && moveKeys[e.key]) {
        this.player.nextDir = moveKeys[e.key];
      }
    }

    onPlayerArrive(cell) {
      const k = key(cell[0], cell[1]);
      if (this.dots.has(k)) {
        this.dots.delete(k);
        this.score += 10;
        if (window.SFX) SFX.eat();
      }
      if (this.pellets.has(k)) {
        this.pellets.delete(k);
        this.score += 50;
        if (window.SFX) SFX.powerup();
        for (const g of this.ghosts) {
          g.frightened = true;
          g.frightTimer = FRIGHT_TIME;
        }
      }
    }

    update(dt) {
      if (this.state !== "PLAYING") return;
      advance(this.player, dt, (e) => choosePlayerDir(e, this.walls), (c) => this.onPlayerArrive(c));
      if (!dirEq(this.player.dir, [0, 0])) this.facing = this.player.dir;
      for (const g of this.ghosts) {
        g.speed = g.frightened ? FRIGHT_SPEED : GHOST_SPEED;
        advance(g, dt, (e) => chooseGhostDir(e, this.walls, this.player));
      }

      for (const g of this.ghosts) {
        if (g.frightened) {
          g.frightTimer -= dt;
          if (g.frightTimer <= 0) g.frightened = false;
        }
      }

      const ppos = this.player.pos();
      for (const g of this.ghosts) {
        const gpos = g.pos();
        const dx = ppos[0] - gpos[0];
        const dy = ppos[1] - gpos[1];
        if (dx * dx + dy * dy < 0.36) {
          if (g.frightened) {
            g.reset();
            g.frightened = false;
            this.score += 200;
            if (window.SFX) SFX.score();
          } else {
            this.lives -= 1;
            if (this.lives <= 0) {
              this.state = "GAMEOVER";
              if (window.SFX) SFX.gameOver();
            } else {
              this.player.reset();
              for (const gg of this.ghosts) gg.reset();
              if (window.SFX) SFX.hit();
            }
          }
          break;
        }
      }

      if (this.dots.size === 0 && this.pellets.size === 0) {
        this.state = "WIN";
        if (window.SFX) SFX.win();
      }
    }

    drawMaze() {
      const ctx = this.ctx;
      for (let row = 0; row < GRID_H; row++) {
        for (let col = 0; col < GRID_W; col++) {
          if (this.walls[row][col]) {
            ctx.fillStyle = BLUE;
            ctx.fillRect(col * CELL, row * CELL + HUD_H, CELL, CELL);
          }
        }
      }
      ctx.fillStyle = DOT_COLOR;
      for (const k of this.dots) {
        const [col, row] = k.split(",").map(Number);
        const cx = col * CELL + CELL / 2;
        const cy = row * CELL + CELL / 2 + HUD_H;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      const blink = Math.floor(performance.now() / 300) % 2 === 0;
      if (blink) {
        for (const k of this.pellets) {
          const [col, row] = k.split(",").map(Number);
          const cx = col * CELL + CELL / 2;
          const cy = row * CELL + CELL / 2 + HUD_H;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      this.drawMaze();

      const ppos = this.player.pos();
      const px = ppos[0] * CELL + CELL / 2;
      const py = ppos[1] * CELL + CELL / 2 + HUD_H;
      const mouth = ((Math.abs(Math.sin(performance.now() * 0.008)) * 40 + 5) * Math.PI) / 180;
      const angle = DIR_TO_ANGLE[this.facing.join(",")] || 0;
      drawPacman(ctx, px, py, CELL / 2 - 1, angle, mouth, YELLOW);

      for (const g of this.ghosts) {
        const gpos = g.pos();
        const gx = gpos[0] * CELL + CELL / 2;
        const gy = gpos[1] * CELL + CELL / 2 + HUD_H;
        drawGhost(ctx, gx, gy, CELL / 2 - 1, g.frightened ? FRIGHT_COLOR : g.color);
      }

      ctx.fillStyle = WHITE;
      ctx.font = "12px Arial";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${this.score}`, 5, HUD_H / 2);
      ctx.textAlign = "right";
      ctx.fillText(`Lives: ${this.lives}`, WIDTH - 5, HUD_H / 2);

      if (this.state === "WIN" || this.state === "GAMEOVER") {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, HEIGHT / 2 - 34, WIDTH, 68);
        ctx.fillStyle = WHITE;
        ctx.textAlign = "center";
        ctx.font = "bold 18px Arial";
        ctx.fillText(this.state === "WIN" ? "YOU WIN!" : "GAME OVER", WIDTH / 2, HEIGHT / 2 - 12);
        ctx.font = "12px Arial";
        ctx.fillText("Press R to play again", WIDTH / 2, HEIGHT / 2 + 14);
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

  window.startPacmanGame = function (canvas) {
    return new PacmanGame(canvas);
  };
})();
