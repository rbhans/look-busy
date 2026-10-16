/**
 * After Hours (Lights Out): every lighting zone has to be off before you can
 * leave. A switch flips its own zone and the zones beside it. Puzzles are made
 * by flipping switches from all-off, so every one is solvable. Score is time.
 */
define([], function () {
  'use strict';

  var N = 5;
  var BULB = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.4 10.2a4.6 4.6 0 1 1 5.2 0v1.8H5.4z"/><path d="M6.4 14.3h3.2"/></svg>';

  function create(api) {
    var board = api.el('div', 'qa-board qa-grid');
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Lighting zones');
    board.style.gridTemplateColumns = 'repeat(' + N + ',1fr)';
    api.wrap.appendChild(board);

    var clock = api.clock(function (s) { api.setScore(api.formatTime(s)); });
    var lit = [];
    var state, moves, focusIndex = 0;
    var cells = [];
    for (var i = 0; i < N * N; i++) {
      (function (k) {
        var b = api.el('button', 'qa-cell');
        b.type = 'button';
        b.tabIndex = k === 0 ? 0 : -1;
        b.innerHTML = BULB;
        b.addEventListener('click', function () { flip(k); });
        b.addEventListener('focus', function () { focusIndex = k; roving(); });
        board.appendChild(b);
        cells.push(b);
      })(i);
    }

    function zones(k) {
      var x = k % N;
      var y = Math.floor(k / N);
      var out = [k];
      if (x > 0) { out.push(k - 1); }
      if (x < N - 1) { out.push(k + 1); }
      if (y > 0) { out.push(k - N); }
      if (y < N - 1) { out.push(k + N); }
      return out;
    }

    function toggle(k) {
      zones(k).forEach(function (z) { lit[z] = !lit[z]; });
    }

    function reset() {
      clock.reset();
      lit = [];
      for (var z = 0; z < N * N; z++) { lit.push(false); }
      do {
        for (var p = 0; p < 12; p++) { toggle(Math.floor(Math.random() * N * N)); }
      } while (count() < 6);
      state = 'ready';
      moves = 0;
      api.setState('ready');
      api.setExtra('Switches', '0');
      api.setStatus('Turn every zone off. Each switch also flips the zones beside it.');
      paint();
    }

    function count() {
      return lit.filter(Boolean).length;
    }

    function flip(k) {
      if (state === 'won') { return; }
      if (state === 'ready') {
        state = 'playing';
        clock.start();
        api.setState('running');
        api.setStatus('');
      }
      toggle(k);
      moves++;
      api.setExtra('Switches', String(moves));
      paint();
      if (!count()) {
        state = 'won';
        clock.stop();
        var seconds = Math.max(1, Math.round(clock.seconds()));
        api.setScore(api.formatTime(seconds));
        api.setState('won');
        api.setStatus('Building secured in ' + api.formatTime(seconds) + ' with ' + moves + ' switches.', true);
        api.finish(seconds);
      }
    }

    function paint() {
      var c = api.colors();
      cells.forEach(function (b, k) {
        b.classList.toggle('qa-lit', lit[k]);
        b.style.color = lit[k] ? '' : api.rgba(c.text, 0.4);
        b.setAttribute('aria-label', 'Zone ' + (k + 1) + (lit[k] ? ', on' : ', off'));
        b.setAttribute('aria-pressed', lit[k] ? 'true' : 'false');
      });
    }

    function roving() {
      cells.forEach(function (b, k) { b.tabIndex = k === focusIndex ? 0 : -1; });
    }

    var disconnect = api.observeSize(function (w, h) {
      var gap = 4;
      board.style.gap = gap + 'px';
      var cell = Math.max(28, Math.floor((Math.min(w, h, 460) - gap * (N - 1)) / N));
      board.style.width = (cell * N + gap * (N - 1)) + 'px';
      board.style.gridAutoRows = cell + 'px';
    });

    reset();

    return {
      onKey: function (e) {
        var d = api.keyDirection(e);
        if (!d || /^[wasdWASD]$/.test(e.key)) { return false; }
        var x = focusIndex % N + (d === 'left' ? -1 : d === 'right' ? 1 : 0);
        var y = Math.floor(focusIndex / N) + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
        if (x >= 0 && y >= 0 && x < N && y < N) { focusIndex = y * N + x; }
        roving();
        cells[focusIndex].focus({ preventScroll: true });
        return true;
      },
      restart: reset,
      redraw: paint,
      destroy: function () {
        state = 'won';
        disconnect();
      }
    };
  }

  return { create: create };
});
