(function () {
  "use strict";

  const WORD_LENGTH = 5;
  const MAX_GUESSES = 6;

  // Self-contained word list (curated common 5-letter words) — used both as
  // the pool of possible secrets and as the accepted-guess dictionary.
  const WORDS = (
    "ABOUT ABOVE ADOPT ADULT AFTER AGAIN AGENT AGREE ALARM ALERT " +
    "ALIVE ALLOW ALONE ALONG APPLE APPLY ARGUE ARISE AVOID AWAKE " +
    "AWARD AWARE BASIC BEACH BEGIN BELOW BENCH BIRTH BLACK BLAME " +
    "BLANK BLAST BLIND BLOCK BLOOD BOARD BRAIN BRAND BREAD BREAK " +
    "BRICK BRIEF BRING BROAD BROWN BUILD BUNCH CANDY CARGO CARRY " +
    "CATCH CAUSE CHAIN CHAIR CHARM CHART CHASE CHEAP CHECK CHESS " +
    "CHEST CHIEF CHILD CHOSE CIVIL CLAIM CLASS CLEAN CLEAR CLICK " +
    "CLIFF CLIMB CLOCK CLOSE CLOTH CLOUD COACH COAST COULD COUNT " +
    "COURT COVER CRAFT CRASH CRAZY CREAM CRIME CROSS CROWD CROWN " +
    "CURVE DAILY DANCE DEATH DELAY DEPTH DIRTY DOUBT DOZEN DRAFT " +
    "DRAIN DRAMA DREAM DRESS DRINK DRIVE EAGER EARLY EARTH EIGHT " +
    "EMPTY ENEMY ENJOY ENTER EQUAL ERROR EVENT EVERY EXACT EXIST " +
    "EXTRA FAITH FALSE FAULT FIELD FIFTH FIFTY FIGHT FINAL FIRST " +
    "FLAME FLASH FLOOR FOCUS FORCE FORTH FORTY FOUND FRAME FRANK " +
    "FRESH FRONT FRUIT FUNNY GHOST GIANT GLASS GLOBE GLORY GRACE " +
    "GRADE GRAND GRANT GRAPH GRASS GREAT GREEN GREET GRIEF GROUP " +
    "GROWN GUARD GUESS GUEST GUIDE HAPPY HEART HEAVY HORSE HOTEL " +
    "HOUSE HUMAN IMAGE INDEX INNER INPUT ISSUE JOINT JUDGE JUICE " +
    "KNIFE KNOCK KNOWN LABEL LARGE LASER LATER LAUGH LAYER LEARN " +
    "LEAST LEAVE LEGAL LEVEL LIGHT LIMIT LOCAL LOGIC LOOSE LOWER " +
    "LOYAL LUCKY LUNCH MAGIC MAJOR MARCH MATCH MEDIA MERCY METAL " +
    "MIGHT MINOR MIXED MODEL MONEY MONTH MORAL MOTOR MOUNT MOUSE " +
    "MOUTH MOVIE MUSIC NERVE NEVER NIGHT NOBLE NOISE NORTH NOVEL " +
    "NURSE OCEAN OFFER OFTEN ORDER OTHER OUTER OWNER PAINT PANEL " +
    "PANIC PAPER PARTY PATCH PAUSE PEACE PHASE PHONE PHOTO PIANO " +
    "PIECE PILOT PITCH PIZZA PLACE PLAIN PLANE PLANT PLATE POINT " +
    "POUND POWER PRESS PRICE PRIDE PRIME PRINT PRIOR PRIZE PROOF " +
    "PROUD PROVE QUEEN QUICK QUIET QUITE QUOTE RADIO RAISE RANGE " +
    "RAPID REACH READY REBEL REFER RELAX REPLY RIGHT RIGID RIVER " +
    "ROBOT ROUGH ROUND ROUTE ROYAL RURAL SALAD SAUCE SCALE SCARE " +
    "SCENE SCOPE SCORE SENSE SERVE SEVEN SHADE SHAKE SHALL SHAPE " +
    "SHARE SHARK SHARP SHEEP SHEET SHELF SHELL SHIFT SHINE SHIRT " +
    "SHOCK SHOOT SHORT SIGHT SILLY SINCE SIXTH SIXTY SKILL SLEEP " +
    "SLICE SLIDE SMALL SMART SMELL SMILE SMOKE SOLAR SOLID SOLVE " +
    "SORRY SOUND SOUTH SPACE SPARE SPARK SPEAK SPEED SPEND SPICE " +
    "SPLIT SPOKE SPORT STAFF STAGE STAND START STATE STEAM STEEL " +
    "STEEP STICK STILL STOCK STONE STORE STORM STORY STUCK STUDY " +
    "STUFF STYLE SUGAR SUPER SWEET SWIFT SWING TABLE TASTE TEACH " +
    "TEETH THANK THEFT THEME THERE THESE THICK THING THINK THIRD " +
    "THOSE THREE THROW THUMB TIGHT TIRED TITLE TODAY TOOTH TOPIC " +
    "TOTAL TOUCH TOUGH TOWER TRACK TRADE TRAIL TRAIN TREAT TREND " +
    "TRIAL TRIBE TRICK TRUCK TRULY TRUNK TRUST TRUTH TWICE UNDER " +
    "UNION UNTIL UPPER URBAN USUAL VALID VALUE VIDEO VIRUS VISIT " +
    "VITAL VOCAL VOICE WASTE WATCH WATER WHEAT WHEEL WHERE WHICH " +
    "WHILE WHITE WHOLE WHOSE WOMAN WORLD WORRY WORSE WORST WORTH " +
    "WOULD WOUND WRITE WRONG WROTE YIELD YOUNG YOUTH"
  ).split(/\s+/);

  const WORD_SET = new Set(WORDS);

  const KEY_ROWS = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"],
  ];

  function pickSecret() {
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  // Classic two-pass Wordle grading: exact matches first (consuming those
  // letters from the pool), then remaining letters checked for presence
  // elsewhere — this is what correctly handles repeated letters.
  function gradeGuess(guess, secret) {
    const result = new Array(WORD_LENGTH).fill("absent");
    const secretArr = secret.split("");
    const guessArr = guess.split("");
    const used = new Array(WORD_LENGTH).fill(false);

    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === secretArr[i]) {
        result[i] = "correct";
        used[i] = true;
      }
    }
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (result[i] === "correct") continue;
      for (let j = 0; j < WORD_LENGTH; j++) {
        if (!used[j] && guessArr[i] === secretArr[j]) {
          result[i] = "present";
          used[j] = true;
          break;
        }
      }
    }
    return result;
  }

  function startWordleGame(container) {
    let secret = pickSecret();
    let currentGuess = "";
    let guesses = [];
    let results = [];
    let state = "PLAYING";
    let keyStatus = {};
    let paused = false;
    let wins = parseInt(localStorage.getItem("portfolio_wordle_wins") || "0", 10);

    container.innerHTML =
      '<div class="wordle-wrap" tabindex="0">' +
      '<div class="wordle-stats" id="wordle-stats">Wins: ' + wins + "</div>" +
      '<div class="wordle-grid" id="wordle-grid"></div>' +
      '<div class="wordle-message" id="wordle-message"></div>' +
      '<div class="wordle-keyboard" id="wordle-keyboard"></div>' +
      "</div>";

    const wrap = container.querySelector(".wordle-wrap");
    const gridEl = container.querySelector("#wordle-grid");
    const msgEl = container.querySelector("#wordle-message");
    const kbEl = container.querySelector("#wordle-keyboard");
    const statsEl = container.querySelector("#wordle-stats");

    for (let r = 0; r < MAX_GUESSES; r++) {
      const row = document.createElement("div");
      row.className = "wordle-row";
      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = document.createElement("div");
        tile.className = "wordle-tile";
        row.appendChild(tile);
      }
      gridEl.appendChild(row);
    }

    function buildKeyboard() {
      kbEl.innerHTML = "";
      for (const rowKeys of KEY_ROWS) {
        const rowEl = document.createElement("div");
        rowEl.className = "wordle-kb-row";
        for (const k of rowKeys) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "wordle-key";
          if (k === "ENTER" || k === "BACK") btn.classList.add("wide");
          btn.textContent = k === "BACK" ? "⌫" : k === "ENTER" ? "Enter" : k;
          btn.dataset.key = k;
          const status = keyStatus[k];
          if (status) btn.classList.add(status);
          btn.addEventListener("click", () => handleKey(k));
          rowEl.appendChild(btn);
        }
        kbEl.appendChild(rowEl);
      }
    }

    function updateKeyStatus(letter, status) {
      const rank = { absent: 0, present: 1, correct: 2 };
      if (!keyStatus[letter] || rank[status] > rank[keyStatus[letter]]) {
        keyStatus[letter] = status;
      }
    }

    function renderGrid() {
      const rows = gridEl.children;
      for (let r = 0; r < MAX_GUESSES; r++) {
        const tiles = rows[r].children;
        const isSubmitted = r < guesses.length;
        const isCurrent = r === guesses.length;
        const letters = isSubmitted ? guesses[r] : isCurrent ? currentGuess : "";
        for (let c = 0; c < WORD_LENGTH; c++) {
          const tile = tiles[c];
          tile.textContent = letters[c] || "";
          tile.classList.remove("correct", "present", "absent", "filled");
          if (letters[c]) tile.classList.add("filled");
          if (isSubmitted) tile.classList.add(results[r][c]);
        }
      }
    }

    function shakeRow() {
      const row = gridEl.children[guesses.length];
      row.classList.add("shake");
      setTimeout(() => row.classList.remove("shake"), 400);
    }

    function setMessage(text, color) {
      msgEl.textContent = text;
      msgEl.style.color = color || "";
    }

    function handleKey(key) {
      if (paused) return;
      if (state !== "PLAYING") return;
      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACK") {
        currentGuess = currentGuess.slice(0, -1);
        setMessage("");
        renderGrid();
      } else if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length < WORD_LENGTH) {
          currentGuess += key;
          renderGrid();
        }
      }
    }

    function submitGuess() {
      if (currentGuess.length < WORD_LENGTH) {
        setMessage("Not enough letters", "#e64c4c");
        shakeRow();
        return;
      }
      if (!WORD_SET.has(currentGuess)) {
        setMessage("Not in word list", "#e64c4c");
        shakeRow();
        return;
      }
      const result = gradeGuess(currentGuess, secret);
      guesses.push(currentGuess);
      results.push(result);
      for (let i = 0; i < WORD_LENGTH; i++) {
        updateKeyStatus(currentGuess[i], result[i]);
      }
      if (window.SFX) SFX.eat();

      if (currentGuess === secret) {
        state = "WON";
        wins += 1;
        localStorage.setItem("portfolio_wordle_wins", String(wins));
        statsEl.textContent = "Wins: " + wins;
        setMessage("You got it in " + guesses.length + "/" + MAX_GUESSES + "! Press Enter for a new word.", "#3ca03c");
        if (window.SFX) SFX.win();
      } else if (guesses.length >= MAX_GUESSES) {
        state = "LOST";
        setMessage("The word was " + secret + ". Press Enter to try again.", "#e64c4c");
        if (window.SFX) SFX.gameOver();
      } else {
        setMessage("");
      }
      currentGuess = "";
      renderGrid();
      buildKeyboard();
    }

    function reset() {
      secret = pickSecret();
      currentGuess = "";
      guesses = [];
      results = [];
      state = "PLAYING";
      keyStatus = {};
      setMessage("");
      renderGrid();
      buildKeyboard();
    }

    function onKeyDown(e) {
      if (document.activeElement !== wrap) return;
      if (paused) return;
      if (state !== "PLAYING") {
        if (e.key === "Enter") reset();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleKey("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKey("BACK");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toUpperCase());
      }
    }

    window.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("click", () => wrap.focus());
    wrap.tabIndex = 0;
    wrap.focus();

    buildKeyboard();
    renderGrid();

    return {
      stop: () => window.removeEventListener("keydown", onKeyDown),
      pause: () => { paused = true; },
      resume: () => { paused = false; },
      getSecret: () => secret,
      _handleKey: handleKey,
      _reset: reset,
      _state: () => state,
    };
  }

  window.startWordleGame = startWordleGame;
})();
