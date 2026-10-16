/**
 * Pipe Fitter: a hydronic loop is generated as a tree of fittings from the
 * pump out to every coil, then each fitting is turned to a random angle.
 * Click (or Space) turns a fitting clockwise, right-click counter-clockwise.
 * Solved when every fitting is on the loop with no open ends. Score is time.
 */
define([], function () {
  'use strict';

  var N = 6;
  var UP = 1;
  var RIGHT = 2;
  var DOWN = 4;
  var LEFT = 8;
  var SIDES = [[UP, 0, -1, DOWN], [RIGHT, 1, 0, LEFT], [DOWN, 0, 1, UP], [LEFT, -1, 0, RIGHT]];
  var PUMP = Math.floor(N / 2) - 1 + (Math.floor(N / 2) - 1) * N;

  function rotate(mask, turns) {
    for (var i = 0; i < ((turns % 4) + 4) % 4; i++) { mask = ((mask << 1) | (mask >> 3)) & 15; }
    return mask;
  }

  function degree(mask) {
    return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
  }

  /** Random spanning tree from the pump (randomized Prim), avoiding four-way fittings. */
  function generate() {
    var masks = [];
    var inTree = [];
    for (var i = 0; i < N * N; i++) { masks.push(0); inTree.push(false); }
    inTree[PUMP] = true;
    var frontier = [];
    function addEdges(cell) {
      SIDES.forEach(function (s) {
        var x = cell % N + s[1];
        var y = Math.floor(cell / N) + s[2];
        if (x >= 0 && y >= 0 && x < N && y < N) { frontier.push([cell, y * N + x, s[0], s[3]]); }
      });
    }
    addEdges(PUMP);
    while (frontier.length) {
      var k = Math.floor(Math.random() * frontier.length);
      var e = frontier.splice(k, 1)[0];
      if (inTree[e[1]]) { continue; }
      // Prefer three-way at most; take a four-way only when nothing else is left.
      if (degree(masks[e[0]]) >= 3 && frontier.some(function (f) { return !inTree[f[1]] && degree(masks[f[0]]) < 3; })) {
        frontier.push(e);
        continue;
      }
      masks[e[0]] |= e[2];
      masks[e[1]] |= e[3];
      inTree[e[1]] = true;
      addEdges(e[1]);
    }
    return masks;
  }

  function create(api) {
    var board = api.el('div', 'qa-board qa-canvas');
    var canvas = api.el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Piping plan');
    board.appendChild(canvas);
    api.wrap.appendChild(board);
    var ctx = canvas.getContext('2d');

    var clock = api.clock(function (s) { api.setScore(api.formatTime(s)); });
    var masks, wet, state, moves, px, cursor, showCursor;

    function reset() {
      clock.reset();
      var solution = generate();
      do {
        masks = solution.map(function (m) { return rotate(m, Math.floor(Math.random() * 4)); });
      } while (solved());
      state = 'ready';
      moves = 0;
      cursor = PUMP;
      showCursor = false;
      api.setState('ready');
      api.setExtra('Turns', '0');
      api.setStatus('Click a fitting to turn it. Get every coil on the pump loop.');
      flow();
      draw();
    }

    function neighbor(cell, side) {
      var x = cell % N + side[1];
      var y = Math.floor(cell / N) + side[2];
      return x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1;
    }

    /** Fittings reachable from the pump through matched connections. */
    function flow() {
      wet = [];
      for (var i = 0; i < N * N; i++) { wet.push(false); }
      var stack = [PUMP];
      wet[PUMP] = true;
      while (stack.length) {
        var c = stack.pop();
        SIDES.forEach(function (s) {
          var n = neighbor(c, s);
          if ((masks[c] & s[0]) && n >= 0 && (masks[n] & s[3]) && !wet[n]) {
            wet[n] = true;
            stack.push(n);
          }
        });
      }
    }

    function solved() {
      flow();
      for (var c = 0; c < N * N; c++) {
        if (!wet[c]) { return false; }
        for (var i = 0; i < 4; i++) {
          var s = SIDES[i];
          if (!(masks[c] & s[0])) { continue; }
          var n = neighbor(c, s);
          if (n < 0 || !(masks[n] & s[3])) { return false; }
        }
      }
      return true;
    }

    function turn(cell, dir) {
      if (state === 'won') { return; }
      if (state === 'ready') {
        state = 'playing';
        clock.start();
        api.setState('running');
        api.setStatus('');
      }
      masks[cell] = rotate(masks[cell], dir);
      moves++;
      api.setExtra('Turns', String(moves));
      if (solved()) {
        state = 'won';
        clock.stop();
        var seconds = Math.max(1, Math.round(clock.seconds()));
        api.setScore(api.formatTime(seconds));
        api.setState('won');
        api.setStatus('Loop balanced in ' + api.formatTime(seconds) + ' with ' + moves + ' turns.', true);
        api.finish(seconds);
      }
      draw();
    }

    function draw() {
      if (!px || !masks) { return; }
      var c = api.colors();
      var cell = px / N;
      var dpr = canvas.width / px;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pipe = Math.max(3, cell * 0.16);
      for (var i = 0; i < N * N; i++) {
        var x = (i % N) * cell;
        var y = Math.floor(i / N) * cell;
        var cx = x + cell / 2;
        var cy = y + cell / 2;
        ctx.fillStyle = api.rgba(c.text, 0.05);
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        var color = wet[i] ? api.rgba(c.accent) : api.rgba(c.text, 0.42);
        ctx.strokeStyle = color;
        ctx.lineWidth = pipe;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        SIDES.forEach(function (s) {
          if (masks[i] & s[0]) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + s[1] * cell / 2, cy + s[2] * cell / 2);
          }
        });
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, pipe / 2, 0, Math.PI * 2);
        ctx.fill();
        if (i === PUMP) {
          drawPump(cx, cy, cell * 0.3, c);
        } else if (degree(masks[i]) === 1) {
          drawCoil(cx, cy, cell * 0.24, c, wet[i]);
        }
        if (showCursor && i === cursor) {
          ctx.strokeStyle = api.rgba(c.accent);
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
        }
      }
    }

    // P&ID pump: a circle with a triangle.
    function drawPump(x, y, r, c) {
      ctx.fillStyle = api.rgba(c.bg);
      ctx.strokeStyle = api.rgba(c.accent);
      ctx.lineWidth = Math.max(1.5, r * 0.14);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = api.rgba(c.accent);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.5);
      ctx.lineTo(x + r * 0.55, y);
      ctx.lineTo(x - r * 0.35, y + r * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Finned coil: a box with fins.
    function drawCoil(x, y, r, c, isWet) {
      ctx.fillStyle = api.rgba(c.bg);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      if (isWet) {
        ctx.fillStyle = api.rgba(c.accent, 0.25);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.strokeStyle = isWet ? api.rgba(c.accent) : api.rgba(c.text, 0.6);
      ctx.lineWidth = Math.max(1.2, r * 0.12);
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
      ctx.beginPath();
      for (var f = -1; f <= 1; f++) {
        ctx.moveTo(x + f * r * 0.5, y - r * 0.65);
        ctx.lineTo(x + f * r * 0.5, y + r * 0.65);
      }
      ctx.stroke();
    }

    function cellAt(e) {
      var rect = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - rect.left) / (rect.width / N));
      var y = Math.floor((e.clientY - rect.top) / (rect.height / N));
      return x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1;
    }

    canvas.addEventListener('click', function (e) {
      var i = cellAt(e);
      if (i >= 0) { showCursor = false; cursor = i; turn(i, 1); }
    });
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var i = cellAt(e);
      if (i >= 0) { showCursor = false; cursor = i; turn(i, -1); }
    });

    var disconnect = api.observeSize(function (w, h) {
      px = Math.max(N * 24, Math.floor(Math.min(w, h, 560) / N) * N);
      var dpr = window.devicePixelRatio || 1;
      canvas.style.width = px + 'px';
      canvas.style.height = px + 'px';
      canvas.width = Math.round(px * dpr);
      canvas.height = Math.round(px * dpr);
      draw();
    });

    reset();

    return {
      onKey: function (e) {
        var d = api.keyDirection(e);
        if (d && !/^[wasdWASD]$/.test(e.key)) {
          var x = cursor % N + (d === 'left' ? -1 : d === 'right' ? 1 : 0);
          var y = Math.floor(cursor / N) + (d === 'up' ? -1 : d === 'down' ? 1 : 0);
          if (x >= 0 && y >= 0 && x < N && y < N) { cursor = y * N + x; }
          showCursor = true;
          draw();
          return true;
        }
        if (e.key === ' ' || e.key === 'Enter') {
          showCursor = true;
          turn(cursor, e.shiftKey ? -1 : 1);
          return true;
        }
        return false;
      },
      restart: reset,
      redraw: draw,
      destroy: function () {
        state = 'won';
        disconnect();
      }
    };
  }

  return { create: create };
});
