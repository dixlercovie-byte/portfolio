(function () {
  "use strict";

  const SIZE = 4;

  const TILE_COLORS = {
    0: "#3a3f4a",
    2: "#eee4da",
    4: "#ede0c8",
    8: "#f2b179",
    16: "#f59563",
    32: "#f67c5f",
    64: "#f65e3b",
    128: "#edcf72",
    256: "#edcc61",
    512: "#edc850",
    1024: "#edc53f",
    2048: "#edc22e",
  };
  const DARK_TEXT = "#5b6472";
  const LIGHT_TEXT = "#f9f6f2";

  function emptyGrid() {
    const g = [];
    for (let r = 0; r < SIZE; r++) g.push(new Array(SIZE).fill(0));
    return g;
  }

  function emptyCells(grid) {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function spawnTile(grid) {
    const cells = emptyCells(grid);
    if (cells.length === 0) return null;
    const [r, c] = cells[Math.floor(Math.random() * cells.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return [r, c];
  }

  // Slides + merges a single line (array of SIZE values) toward index 0.
  // Each tile merges at most once per move — the classic 2048 rule.
  function slideLine(line) {
    const filtered = line.filter((v) => v !== 0);
    const merged = [];
    let gained = 0;
    let i = 0;
    while (i < filtered.length) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        merged.push(val);
        gained += val;
        i += 2;
      } else {
        merged.push(filtered[i]);
        i += 1;
      }
    }
    while (merged.length < SIZE) merged.push(0);
    return { line: merged, gained };
  }

  function cloneGrid(grid) {
    return grid.map((row) => row.slice());
  }

  function gridsEqual(a, b) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function move(grid, direction) {
    const before = cloneGrid(grid);
    let gained = 0;

    if (direction === "left" || direction === "right") {
      for (let r = 0; r < SIZE; r++) {
        let row = grid[r].slice();
        if (direction === "right") row.reverse();
        const res = slideLine(row);
        let newRow = res.line;
        if (direction === "right") newRow = newRow.slice().reverse();
        grid[r] = newRow;
        gained += res.gained;
      }
    } else {
      for (let c = 0; c < SIZE; c++) {
        let col = [];
        for (let r = 0; r < SIZE; r++) col.push(grid[r][c]);
        if (direction === "up") {
          // top of column is index 0, already correct order
        } else {
          col.reverse();
        }
        const res = slideLine(col);
        let newCol = res.line;
        if (direction === "down") newCol = newCol.slice().reverse();
        for (let r = 0; r < SIZE; r++) grid[r][c] = newCol[r];
        gained += res.gained;
      }
    }

    const changed = !gridsEqual(before, grid);
    return { changed, gained };
  }

  function hasMoves(grid) {
    if (emptyCells(grid).length > 0) return true;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c];
        if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
        if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
      }
    }
    return false;
  }

  function start2048Game(container) {
    let grid = emptyGrid();
    let score = 0;
    let best = parseInt(localStorage.getItem("portfolio_2048_best") || "0", 10);
    let state = "PLAYING";
    let hasWon = false;
    let paused = false;

    container.innerHTML =
      '<div class="g2048-wrap" tabindex="0">' +
      '<div class="g2048-hud"><span id="g2048-score">Score: 0</span><span id="g2048-best">Best: ' +
      best +
      '</span></div>' +
      '<div class="g2048-board" id="g2048-board"></div>' +
      '<div class="g2048-message" id="g2048-message"></div>' +
      "</div>";

    const wrap = container.querySelector(".g2048-wrap");
    const boardEl = container.querySelector("#g2048-board");
    const scoreEl = container.querySelector("#g2048-score");
    const bestEl = container.querySelector("#g2048-best");
    const msgEl = container.querySelector("#g2048-message");

    const cellEls = [];
    for (let r = 0; r < SIZE; r++) {
      const rowEls = [];
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement("div");
        cell.className = "g2048-cell";
        boardEl.appendChild(cell);
        rowEls.push(cell);
      }
      cellEls.push(rowEls);
    }

    function render(spawned) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const val = grid[r][c];
          const cell = cellEls[r][c];
          cell.textContent = val === 0 ? "" : String(val);
          cell.style.background = TILE_COLORS[val] || "#3c3a32";
          cell.style.color = val <= 4 ? DARK_TEXT : LIGHT_TEXT;
          cell.style.fontSize = val >= 1024 ? "0.85rem" : val >= 128 ? "1rem" : "1.15rem";
          cell.classList.remove("pop");
          if (spawned && spawned[0] === r && spawned[1] === c) {
            void cell.offsetWidth;
            cell.classList.add("pop");
          }
        }
      }
      scoreEl.textContent = "Score: " + score;
      bestEl.textContent = "Best: " + best;
    }

    function setMessage(text, color) {
      msgEl.textContent = text;
      msgEl.style.color = color || "";
    }

    function doMove(direction) {
      if (state !== "PLAYING") return;
      const result = move(grid, direction);
      if (!result.changed) return;
      score += result.gained;
      if (score > best) {
        best = score;
        localStorage.setItem("portfolio_2048_best", String(best));
      }
      const spawned = spawnTile(grid);
      render(spawned);

      if (window.SFX) SFX.eat();

      if (!hasWon) {
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            if (grid[r][c] === 2048) {
              hasWon = true;
              state = "WON";
              setMessage("You reached 2048! Press R for a new game (or keep playing).", "#3ca03c");
              if (window.SFX) SFX.win();
            }
          }
        }
      }

      if (state === "PLAYING" && !hasMoves(grid)) {
        state = "GAMEOVER";
        setMessage("No more moves! Press R to try again.", "#e64c4c");
        if (window.SFX) SFX.gameOver();
      }
    }

    function reset() {
      grid = emptyGrid();
      score = 0;
      state = "PLAYING";
      hasWon = false;
      spawnTile(grid);
      spawnTile(grid);
      setMessage("");
      render(null);
    }

    function onKeyDown(e) {
      if (document.activeElement !== wrap) return;
      if (paused) return;
      const map = {
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
      };
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        reset();
        return;
      }
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        // Allow continued play after winning, but not after game over.
        if (state === "WON") state = "PLAYING";
        doMove(dir);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("click", () => wrap.focus());
    wrap.focus();

    spawnTile(grid);
    spawnTile(grid);
    render(null);

    return {
      stop: () => window.removeEventListener("keydown", onKeyDown),
      pause: () => { paused = true; },
      resume: () => { paused = false; },
      getGrid: () => cloneGrid(grid),
      getScore: () => score,
      _move: doMove,
      _reset: reset,
      _state: () => state,
    };
  }

  window.start2048Game = start2048Game;
})();
