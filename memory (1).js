function startMemoryGame(container) {
  const EMOJIS = ["🍎", "🚀", "🎸", "🐙", "🌵", "⚡", "🎲", "🍩"];
  const BEST_KEY = "memoryMatchBest";

  container.innerHTML =
    '<div class="memory-wrap" id="memory-wrap" tabindex="0">' +
      '<div class="memory-hud">' +
        '<span>Moves: <b id="memory-moves">0</b></span>' +
        '<span>Matches: <b id="memory-matches">0</b>/8</span>' +
        '<span>Best: <b id="memory-best">–</b></span>' +
      "</div>" +
      '<div class="memory-board" id="memory-board"></div>' +
      '<div class="memory-message" id="memory-message"></div>' +
      '<button class="memory-restart-btn" id="memory-restart-btn" type="button">Restart</button>' +
    "</div>";

  const wrap = document.getElementById("memory-wrap");
  const board = document.getElementById("memory-board");
  const movesEl = document.getElementById("memory-moves");
  const matchesEl = document.getElementById("memory-matches");
  const bestEl = document.getElementById("memory-best");
  const messageEl = document.getElementById("memory-message");
  const restartBtn = document.getElementById("memory-restart-btn");

  let flipped = [];
  let matched = 0;
  let moves = 0;
  let lockBoard = false;
  let paused = false;
  let cardEls = [];

  function loadBest() {
    const best = localStorage.getItem(BEST_KEY);
    bestEl.textContent = best ? best : "–";
  }

  function saveBest(m) {
    const current = localStorage.getItem(BEST_KEY);
    if (!current || m < parseInt(current, 10)) {
      localStorage.setItem(BEST_KEY, m);
      loadBest();
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function onCardClick(card) {
    if (lockBoard || paused) return;
    if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

    card.classList.add("flipped");
    flipped.push(card);

    if (flipped.length === 2) {
      moves++;
      movesEl.textContent = String(moves);
      checkMatch();
    }
  }

  function checkMatch() {
    const a = flipped[0];
    const b = flipped[1];
    if (a.dataset.symbol === b.dataset.symbol) {
      a.classList.add("matched");
      b.classList.add("matched");
      matched++;
      matchesEl.textContent = String(matched);
      flipped = [];
      if (matched === EMOJIS.length) {
        finishGame();
      }
    } else {
      lockBoard = true;
      setTimeout(function () {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        flipped = [];
        lockBoard = false;
      }, 700);
    }
  }

  function finishGame() {
    messageEl.textContent = "🎉 Solved in " + moves + " moves!";
    saveBest(moves);
  }

  function buildBoard() {
    board.innerHTML = "";
    cardEls = [];
    matched = 0;
    moves = 0;
    flipped = [];
    lockBoard = false;
    movesEl.textContent = "0";
    matchesEl.textContent = "0";
    messageEl.textContent = "";

    const deck = shuffle(EMOJIS.concat(EMOJIS));
    deck.forEach(function (symbol) {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.dataset.symbol = symbol;
      card.innerHTML =
        '<div class="memory-card-face memory-card-back"></div>' +
        '<div class="memory-card-face memory-card-front">' + symbol + "</div>";
      card.addEventListener("click", function () {
        onCardClick(card);
      });
      board.appendChild(card);
      cardEls.push(card);
    });
  }

  restartBtn.addEventListener("click", buildBoard);

  loadBest();
  buildBoard();
  wrap.focus();

  return {
    pause: function () {
      paused = true;
    },
    resume: function () {
      paused = false;
    },
    stop: function () {
      // wireDomGame/addExitButton replaces container.innerHTML afterward,
      // so no extra teardown of DOM listeners is required here.
    }
  };
}
