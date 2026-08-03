(function () {
  "use strict";

  function startGuessGame(container) {
    let secret = Math.floor(Math.random() * 100) + 1;
    let attempts = 0;
    let paused = false;
    let gameWon = false;

    container.innerHTML =
      '<div class="guess-log" id="guess-log">Welcome to Guess the Number!\n' +
      "I'm thinking of a number between 1 and 100.\n</div>" +
      '<form id="guess-form" class="guess-form">' +
      '<input type="number" id="guess-input" min="1" max="100" placeholder="Your guess" autocomplete="off">' +
      '<button type="submit">Guess</button>' +
      "</form>";

    const log = container.querySelector("#guess-log");
    const form = container.querySelector("#guess-form");
    const input = container.querySelector("#guess-input");
    const btn = form.querySelector("button");

    function appendLine(text) {
      log.textContent += text + "\n";
      log.scrollTop = log.scrollHeight;
    }

    function playAgain() {
      secret = Math.floor(Math.random() * 100) + 1;
      attempts = 0;
      gameWon = false;
      input.disabled = false;
      input.value = "";
      btn.textContent = "Guess";
      btn.type = "submit";
      btn.onclick = null;
      log.textContent =
        "Welcome to Guess the Number!\nI'm thinking of a number between 1 and 100.\n";
      input.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (paused) return;
      const val = input.value.trim();
      if (!/^\d+$/.test(val)) {
        appendLine("Please enter a whole number.");
        input.value = "";
        return;
      }
      const guess = parseInt(val, 10);
      attempts++;
      appendLine("Your guess: " + guess);
      if (guess < secret) {
        appendLine("Too low!");
      } else if (guess > secret) {
        appendLine("Too high!");
      } else {
        appendLine("You got it! The number was " + secret + ".");
        appendLine("It took you " + attempts + " guesses.");
        if (window.SFX) SFX.win();
        gameWon = true;
        input.disabled = true;
        btn.textContent = "Play Again";
        btn.type = "button";
        btn.onclick = playAgain;
        return;
      }
      input.value = "";
      input.focus();
    });

    input.focus();

    return {
      getSecret: () => secret,
      getAttempts: () => attempts,
      pause: () => {
        paused = true;
        input.disabled = true;
      },
      resume: () => {
        paused = false;
        if (!gameWon) input.disabled = false;
      },
      stop: () => {},
    };
  }

  window.startGuessGame = startGuessGame;
})();
