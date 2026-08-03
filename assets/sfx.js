(function () {
  "use strict";

  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, duration, opts) {
    if (SFX.muted) return;
    const c = getCtx();
    if (!c) return;
    opts = opts || {};
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || "square";
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (opts.sweepTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), c.currentTime + duration);
    }
    const vol = opts.volume != null ? opts.volume : 0.15;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  function noiseBurst(duration, opts) {
    if (SFX.muted) return;
    const c = getCtx();
    if (!c) return;
    opts = opts || {};
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(opts.volume != null ? opts.volume : 0.2, c.currentTime);
    noise.connect(gain).connect(c.destination);
    noise.start();
  }

  function sequence(notes) {
    for (const n of notes) {
      setTimeout(function () {
        tone(n.freq, n.duration, n);
      }, (n.delay || 0) * 1000);
    }
  }

  const SFX = {
    muted: localStorage.getItem("portfolio_sfx_muted") === "1",

    toggleMute: function () {
      SFX.muted = !SFX.muted;
      localStorage.setItem("portfolio_sfx_muted", SFX.muted ? "1" : "0");
      return SFX.muted;
    },

    eat: function () {
      tone(660, 0.06, { type: "square", volume: 0.15 });
    },
    powerup: function () {
      sequence([
        { freq: 440, duration: 0.08, delay: 0 },
        { freq: 660, duration: 0.08, delay: 0.08 },
        { freq: 880, duration: 0.12, delay: 0.16 },
      ]);
    },
    score: function () {
      tone(880, 0.1, { type: "square", volume: 0.15 });
    },
    jump: function () {
      tone(320, 0.12, { type: "square", sweepTo: 600, volume: 0.15 });
    },
    bounce: function () {
      tone(220, 0.05, { type: "square", volume: 0.12 });
    },
    brick: function () {
      tone(520, 0.07, { type: "square", sweepTo: 180, volume: 0.15 });
    },
    launch: function () {
      tone(300, 0.1, { type: "square", sweepTo: 500, volume: 0.13 });
    },
    hit: function () {
      noiseBurst(0.2, { volume: 0.22 });
    },
    gameOver: function () {
      sequence([
        { freq: 392, duration: 0.15, delay: 0 },
        { freq: 330, duration: 0.15, delay: 0.15 },
        { freq: 262, duration: 0.35, delay: 0.3 },
      ]);
    },
    win: function () {
      sequence([
        { freq: 523, duration: 0.1, delay: 0 },
        { freq: 659, duration: 0.1, delay: 0.1 },
        { freq: 784, duration: 0.1, delay: 0.2 },
        { freq: 1047, duration: 0.25, delay: 0.3 },
      ]);
    },
    turn: function () {
      tone(180, 0.03, { type: "square", volume: 0.06 });
    },
  };

  window.SFX = SFX;
})();
