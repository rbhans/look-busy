/**
 * Panel Build (falling blocks): I/O modules drop onto a control panel's DIN
 * rails; a full rail clears. Standard seven shapes from a shuffled bag, simple
 * wall kicks, speed rises every ten rails. Score: 100/300/500/800 x level for
 * 1-4 rails, plus 1 per soft-dropped and 2 per hard-dropped row.
 */
define([], function () {
  'use strict';

  var COLS = 10;
  var ROWS = 20;
  var SIDE = 5;
  var SHAPES = {
    I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
  };
  var KINDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var LINE_POINTS = [0, 100, 300, 500, 800];

  function create(api) {
    var board = api.el('div', 'qa-board qa-canvas');
    var canvas = api.el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Control panel');
    board.appendChild(canvas);
    api.wrap.appendChild(board);
    var ctx = canvas.getContext('2d');

    var grid, piece, next, bag, score, lines, level, state, timer, cell;

    function reset() {
      clearTimeout(timer);
      grid = [];
      for (var y = 0; y < ROWS; y++) { grid.push(new Array(COLS).fill(null)); }
      bag = [];
      score = 0;
      lines = 0;
      level = 1;
      next = take();
      spawn();
      state = 'ready';
      api.setScore('0');
      api.setExtra('Rails', '0');
      api.setState('ready');
      api.setStatus('Arrows move, Up rotates, Space drops. Press any of them to start.');
      draw();
    }

    function take() {
      if (!bag.length) {
        bag = KINDS.slice();
        for (var i = bag.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
      }
      return bag.pop();
    }

    function make(kind) {
      var s = SHAPES[kind];
      return { kind: kind, size: s.size, cells: s.cells.map(function (c) { return c.slice(); }), x: Math.floor((COLS - s.size) / 2), y: 0 };
    }

    function spawn() {
      piece = make(next);
      next = take();
      return fits(piece.cells, piece.x, piece.y);
    }

    function fits(cells, px, py) {
      return cells.every(function (c) {
        var x = px + c[0];
        var y = py + c[1];
        return x >= 0 && x < COLS && y < ROWS && (y < 0 || !grid[y][x]);
      });
    }

    function rotated(dir) {
      var n = piece.size;
      return piece.cells.map(function (c) { return dir > 0 ? [n - 1 - c[1], c[0]] : [c[1], n - 1 - c[0]]; });
    }

    function rotate(dir) {
      if (piece.kind === 'O') { return; }
      var cells = rotated(dir);
      var kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
      for (var i = 0; i < kicks.length; i++) {
        if (fits(cells, piece.x + kicks[i][0], piece.y + kicks[i][1])) {
          piece.cells = cells;
          piece.x += kicks[i][0];
          piece.y += kicks[i][1];
          draw();
          return;
        }
      }
    }

    function shift(dx) {
      if (fits(piece.cells, piece.x + dx, piece.y)) { piece.x += dx; draw(); }
    }

    /** One row down; locks the module when it can't move. Returns whether it moved. */
    function down() {
      if (fits(piece.cells, piece.x, piece.y + 1)) {
        piece.y++;
        return true;
      }
      lock();
      return false;
    }

    function lock() {
      piece.cells.forEach(function (c) {
        var y = piece.y + c[1];
        if (y >= 0) { grid[y][piece.x + c[0]] = piece.kind; }
      });
      var cleared = 0;
      for (var y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(Boolean)) {
          grid.splice(y, 1);
          grid.unshift(new Array(COLS).fill(null));
          cleared++;
          y++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += LINE_POINTS[cleared] * level;
        var nextLevel = 1 + Math.floor(lines / 10);
        if (nextLevel !== level) {
          level = nextLevel;
          api.setStatus('Level ' + level + '. The modules come faster.');
        }
        api.setExtra('Rails', String(lines));
        api.setScore(String(score));
      }
      if (!spawn()) { gameOver(); }
    }

    function gravityMs() {
      return Math.max(90, 750 - (level - 1) * 65);
    }

    function tick() {
      if (state !== 'running') { return; }
      down();
      draw();
      if (state === 'running') { timer = setTimeout(tick, gravityMs()); }
    }

    function start() {
      if (state === 'running' || state === 'over') { return; }
      state = 'running';
      api.setState('running');
      api.setStatus('');
      clearTimeout(timer);
      timer = setTimeout(tick, gravityMs());
    }

    function pause() {
      if (state !== 'running') { return; }
      clearTimeout(timer);
      state = 'paused';
      api.setState('paused');
      api.setStatus('Paused. Press P or any control to continue');
      draw();
    }

    function gameOver() {
      clearTimeout(timer);
      state = 'over';
      api.setState('over');
      api.setStatus('Panel full. ' + score + ' points, ' + lines + ' rails. Press New game or Enter to build again.', true);
      draw();
      api.finish(score);
    }

    function softDrop() {
      if (down()) { score += 1; api.setScore(String(score)); }
      restartTimer();
      draw();
    }

    function hardDrop() {
      var rows = 0;
      while (fits(piece.cells, piece.x, piece.y + 1)) { piece.y++; rows++; }
      score += rows * 2;
      api.setScore(String(score));
      lock();
      restartTimer();
      draw();
    }

    function restartTimer() {
      if (state !== 'running') { return; }
      clearTimeout(timer);
      timer = setTimeout(tick, gravityMs());
    }

    function ghostY() {
      var y = piece.y;
      while (fits(piece.cells, piece.x, y + 1)) { y++; }
      return y;
    }

    function module(x, y, size, kind, c, alpha) {
      var k = KINDS.indexOf(kind);
      ctx.fillStyle = api.rgba(c.accent, (0.38 + k * 0.07) * alpha);
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      ctx.strokeStyle = api.rgba(c.accent, alpha);
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
      // Status LED and a terminal strip, like a real I/O module.
      ctx.fillStyle = api.rgba(c.text, 0.75 * alpha);
      ctx.beginPath();
      ctx.arc(x + size * 0.75, y + size * 0.27, Math.max(1.2, size * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = api.rgba(c.text, 0.35 * alpha);
      ctx.fillRect(x + size * 0.2, y + size * 0.7, size * 0.6, Math.max(1, size * 0.08));
    }

    function draw() {
      if (!cell || !grid) { return; }
      var c = api.colors();
      var dpr = canvas.width / (cell * (COLS + SIDE));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var w = cell * COLS;
      var h = cell * ROWS;
      ctx.fillStyle = api.rgba(c.text, 0.04);
      ctx.fillRect(0, 0, w, h);
      // DIN rails behind every row.
      ctx.fillStyle = api.rgba(c.text, 0.06);
      for (var r = 0; r < ROWS; r++) { ctx.fillRect(0, r * cell + cell * 0.42, w, cell * 0.16); }

      var dim = state === 'over' ? 0.45 : 1;
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if (grid[y][x]) { module(x * cell, y * cell, cell, grid[y][x], c, dim); }
        }
      }
      if (state !== 'over') {
        var gy = ghostY();
        ctx.strokeStyle = api.rgba(c.text, 0.3);
        ctx.setLineDash([3, 3]);
        piece.cells.forEach(function (p) { ctx.strokeRect((piece.x + p[0]) * cell + 2.5, (gy + p[1]) * cell + 2.5, cell - 5, cell - 5); });
        ctx.setLineDash([]);
        piece.cells.forEach(function (p) {
          if (piece.y + p[1] >= 0) { module((piece.x + p[0]) * cell, (piece.y + p[1]) * cell, cell, piece.kind, c, 1); }
        });
      }

      // Next module, in the side column.
      var sx = w + cell * 0.6;
      ctx.fillStyle = api.rgba(c.text, 0.72);
      ctx.font = '600 ' + Math.max(10, Math.round(cell * 0.5)) + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('Next', sx, cell * 0.3);
      var ns = SHAPES[next];
      var small = cell * 0.8;
      ns.cells.forEach(function (p) { module(sx + p[0] * small, cell * 1.4 + p[1] * small, small, next, c, dim); });
    }

    var disconnect = api.observeSize(function (w, h) {
      cell = Math.max(10, Math.floor(Math.min(w / (COLS + SIDE), h / ROWS)));
      var dpr = window.devicePixelRatio || 1;
      canvas.style.width = cell * (COLS + SIDE) + 'px';
      canvas.style.height = cell * ROWS + 'px';
      canvas.width = Math.round(cell * (COLS + SIDE) * dpr);
      canvas.height = Math.round(cell * ROWS * dpr);
      draw();
    });

    function control(action) {
      if (state === 'over') { return; }
      // The first control only starts (or resumes) the game, so Space doesn't drop a module unseen.
      if (state !== 'running') { start(); return; }
      if (action === 'left') { shift(-1); }
      if (action === 'right') { shift(1); }
      if (action === 'down') { softDrop(); }
      if (action === 'rotate') { rotate(1); }
      if (action === 'rotateBack') { rotate(-1); }
      if (action === 'drop') { hardDrop(); }
    }

    api.onSwipe(board, function (d) { control(d === 'down' ? 'drop' : d === 'up' ? 'rotate' : d); });
    var tapStart = null;
    board.addEventListener('pointerdown', function (e) { tapStart = [e.clientX, e.clientY]; });
    board.addEventListener('pointerup', function (e) {
      if (tapStart && Math.abs(e.clientX - tapStart[0]) < 10 && Math.abs(e.clientY - tapStart[1]) < 10) { control('rotate'); }
      tapStart = null;
    });
    var frame = api.wrap.closest('.qa-frame');
    var onBlur = function () { setTimeout(function () { if (!api.isFocused()) { pause(); } }, 0); };
    frame.addEventListener('focusout', onBlur);

    reset();

    return {
      onKey: function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && state === 'over') { reset(); return true; }
        if (e.key === 'p' || e.key === 'P') {
          if (state === 'running') { pause(); } else { start(); }
          return true;
        }
        var map = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowDown: 'down', s: 'down', S: 'down',
          ArrowUp: 'rotate', w: 'rotate', W: 'rotate', x: 'rotate', X: 'rotate', z: 'rotateBack', Z: 'rotateBack', ' ': 'drop' };
        if (!map[e.key]) { return false; }
        control(map[e.key]);
        return true;
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
