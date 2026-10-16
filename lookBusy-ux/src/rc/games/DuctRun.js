/**
 * Duct Run (snake) on a reflected ceiling plan. The run grows by one length per
 * diffuser it reaches. Starts on the first direction input, pauses when the
 * widget loses focus or is hidden, speeds up as it grows.
 */
define([], function () {
  'use strict';

  var SIZE = 18;
  var START_MS = 150;
  var MIN_MS = 70;
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  function create(api) {
    var board = api.el('div', 'qa-board qa-canvas');
    var canvas = api.el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Ceiling plan');
    board.appendChild(canvas);
    api.wrap.appendChild(board);
    var ctx = canvas.getContext('2d');

    var run, dir, queue, diffuser, score, state, timer, px;

    function reset() {
      clearTimeout(timer);
      var mid = Math.floor(SIZE / 2);
      run = [[mid - 2, mid], [mid - 3, mid], [mid - 4, mid]];
      dir = 'right';
      queue = [];
      score = 0;
      state = 'ready';
      placeDiffuser();
      api.setScore('0');
      api.setState('ready');
      api.setStatus('Press an arrow key or swipe to start the run');
      draw();
    }

    function placeDiffuser() {
      var free = [];
      for (var x = 0; x < SIZE; x++) {
        for (var y = 0; y < SIZE; y++) {
          if (!run.some(function (s) { return s[0] === x && s[1] === y; })) { free.push([x, y]); }
        }
      }
      diffuser = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function delay() {
      return Math.max(MIN_MS, START_MS - score * 3);
    }

    function step() {
      if (state !== 'running') { return; }
      if (queue.length) { dir = queue.shift(); }
      var d = DIRS[dir];
      var head = [run[0][0] + d[0], run[0][1] + d[1]];
      var reached = diffuser && head[0] === diffuser[0] && head[1] === diffuser[1];
      // The tail moves away this tick unless the run is growing.
      var body = reached ? run : run.slice(0, -1);
      if (head[0] < 0 || head[1] < 0 || head[0] >= SIZE || head[1] >= SIZE) {
        gameOver('Ran into the wall.');
        return;
      }
      if (body.some(function (s) { return s[0] === head[0] && s[1] === head[1]; })) {
        gameOver('Crossed your own run.');
        return;
      }
      run = [head].concat(body);
      if (reached) {
        score++;
        api.setScore(String(score));
        placeDiffuser();
        if (!diffuser) { gameOver('Every diffuser is connected!'); return; }
      }
      draw();
      timer = setTimeout(step, delay());
    }

    function gameOver(why) {
      state = 'over';
      api.setState('over');
      draw();
      api.setStatus(why + ' ' + score + ' diffusers. Press New game or Space to run again.', true);
      api.finish(score);
    }

    function start() {
      if (state === 'running' || state === 'over') { return; }
      state = 'running';
      api.setState('running');
      api.setStatus('');
      timer = setTimeout(step, delay());
    }

    function pause() {
      if (state !== 'running') { return; }
      clearTimeout(timer);
      state = 'paused';
      api.setState('paused');
      api.setStatus('Paused. Press an arrow key or Space to continue');
      draw();
    }

    function turn(next) {
      var last = queue.length ? queue[queue.length - 1] : dir;
      if (next !== last && next !== OPPOSITE[last] && queue.length < 2) { queue.push(next); }
      start();
    }

    function draw() {
      if (!px || !run) { return; }
      var c = api.colors();
      var cell = px / SIZE;
      var dpr = canvas.width / px;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = api.rgba(c.text, 0.04);
      ctx.fillRect(0, 0, px, px);

      // Ceiling grid: one tile per two cells.
      ctx.strokeStyle = api.rgba(c.text, 0.1);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var i = 2; i < SIZE; i += 2) {
        var p = Math.round(i * cell) + 0.5;
        ctx.moveTo(p, 0); ctx.lineTo(p, px);
        ctx.moveTo(0, p); ctx.lineTo(px, p);
      }
      ctx.stroke();

      if (diffuser) {
        // Ceiling diffuser symbol: a square with its diagonals.
        var s = cell * 0.62;
        var x0 = diffuser[0] * cell + (cell - s) / 2;
        var y0 = diffuser[1] * cell + (cell - s) / 2;
        ctx.strokeStyle = api.rgba(c.text, 0.85);
        ctx.lineWidth = Math.max(1.4, cell * 0.08);
        ctx.strokeRect(x0, y0, s, s);
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + s, y0 + s);
        ctx.moveTo(x0 + s, y0); ctx.lineTo(x0, y0 + s);
        ctx.stroke();
      }

      var dim = state === 'over' ? 0.45 : 1;
      var width = cell * 0.56;
      function center(seg) { return [(seg[0] + 0.5) * cell, (seg[1] + 0.5) * cell]; }

      // Duct body as one path so bends read as elbows.
      ctx.strokeStyle = api.rgba(c.accent, 0.82 * dim);
      ctx.lineWidth = width;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      run.forEach(function (seg, k) {
        var pt = center(seg);
        if (k === 0) { ctx.moveTo(pt[0], pt[1]); } else { ctx.lineTo(pt[0], pt[1]); }
      });
      if (run.length === 1) { ctx.lineTo(center(run[0])[0] + 0.01, center(run[0])[1]); }
      ctx.stroke();

      // Flanges at the joints between duct lengths.
      ctx.strokeStyle = api.rgba(c.accent, dim);
      ctx.lineWidth = Math.max(1.5, cell * 0.1);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      for (var k = 1; k < run.length; k++) {
        var a = center(run[k - 1]);
        var b = center(run[k]);
        var mx = (a[0] + b[0]) / 2;
        var my = (a[1] + b[1]) / 2;
        var half = width / 2 + 2;
        if (a[0] !== b[0]) { ctx.moveTo(mx, my - half); ctx.lineTo(mx, my + half); } else { ctx.moveTo(mx - half, my); ctx.lineTo(mx + half, my); }
      }
      ctx.stroke();

      // Airflow arrow on the leading length.
      var h = center(run[0]);
      var v = DIRS[queue.length && state !== 'running' ? queue[0] : dir];
      var r = width * 0.32;
      ctx.fillStyle = api.rgba(c.bg, 0.9 * dim + 0.1);
      ctx.beginPath();
      ctx.moveTo(h[0] + v[0] * r, h[1] + v[1] * r);
      ctx.lineTo(h[0] - v[0] * r - v[1] * r, h[1] - v[1] * r + v[0] * r);
      ctx.lineTo(h[0] - v[0] * r + v[1] * r, h[1] - v[1] * r - v[0] * r);
      ctx.closePath();
      ctx.fill();
    }

    var disconnect = api.observeSize(function (w, h) {
      px = Math.max(SIZE * 6, Math.floor(Math.min(w, h) / SIZE) * SIZE);
      var dpr = window.devicePixelRatio || 1;
      canvas.style.width = px + 'px';
      canvas.style.height = px + 'px';
      canvas.width = Math.round(px * dpr);
      canvas.height = Math.round(px * dpr);
      draw();
    });

    api.onSwipe(board, function (d) { if (state !== 'over') { turn(d); } });
    var frame = api.wrap.closest('.qa-frame');
    var onBlur = function () { setTimeout(function () { if (!api.isFocused()) { pause(); } }, 0); };
    frame.addEventListener('focusout', onBlur);

    reset();

    return {
      onKey: function (e) {
        var d = api.keyDirection(e);
        if (d) {
          if (state !== 'over') { turn(d); }
          return true;
        }
        if (e.key === ' ' || e.key === 'Spacebar') {
          if (state === 'over') { reset(); } else if (state === 'running') { pause(); } else { start(); }
          return true;
        }
        return false;
      },
      restart: reset,
      redraw: draw,
      suspend: pause,
      destroy: function () {
        clearTimeout(timer);
        state = 'over';
        disconnect();
        frame.removeEventListener('focusout', onBlur);
      }
    };
  }

  return { create: create };
});
