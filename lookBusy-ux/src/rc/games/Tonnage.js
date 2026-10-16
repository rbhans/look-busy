/**
 * Tonnage (2048): slide the plant, equal units merge into one twice the size.
 * Score is the sum of merged tonnage. Tiles are DOM elements moved with
 * transforms so slides animate.
 */
define([], function () {
  'use strict';

  var N = 4;
  var GAP = 8;
  var VECTORS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function create(api) {
    var board = api.el('div', 'qa-board qa-tiles');
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Chiller plant');
    api.wrap.appendChild(board);

    var slots = [];
    for (var i = 0; i < N * N; i++) {
      var slot = api.el('div', 'qa-tile-slot');
      board.appendChild(slot);
      slots.push(slot);
    }

    var grid, tiles, score, nextId, over, won, cell, size;

    function reset() {
      tiles.forEach(function (t) { t.node.remove(); });
      grid = [];
      for (var y = 0; y < N; y++) { grid.push([null, null, null, null]); }
      tiles = [];
      score = 0;
      over = false;
      won = false;
      api.setScore('0');
      api.setState('ready');
      api.setStatus('Arrow keys or swipe to slide the plant. Matching units merge.');
      addRandom();
      addRandom();
      layout();
    }

    function addRandom() {
      var free = [];
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) { if (!grid[y][x]) { free.push([x, y]); } }
      }
      if (!free.length) { return; }
      var p = free[Math.floor(Math.random() * free.length)];
      var t = makeTile(Math.random() < 0.9 ? 2 : 4, p[0], p[1]);
      t.node.classList.add('qa-new');
    }

    function makeTile(value, x, y) {
      var t = { id: nextId++, value: value, x: x, y: y, node: api.el('div', 'qa-tile') };
      grid[y][x] = t;
      tiles.push(t);
      board.appendChild(t.node);
      paint(t);
      return t;
    }

    function paint(t) {
      var c = api.colors();
      var level = Math.log2(t.value);
      // Accent tint deepens with the tile value; text stays the text color.
      t.node.style.background = api.rgba(c.accent, Math.min(0.08 + (level - 1) * 0.045, 0.5));
      t.node.style.boxShadow = level >= 7 ? 'inset 0 0 0 2px ' + api.rgba(c.accent) : '';
      t.node.textContent = String(t.value);
      t.node.appendChild(api.el('small', null, 'TONS'));
      t.node.setAttribute('aria-label', t.value + ' tons');
      if (cell) {
        var digits = String(t.value).length;
        t.node.style.fontSize = Math.floor(cell * (digits < 3 ? 0.4 : digits === 3 ? 0.34 : digits === 4 ? 0.27 : 0.22)) + 'px';
      }
    }

    function place(node, x, y) {
      node.style.transform = 'translate(' + (GAP + x * (cell + GAP)) + 'px,' + (GAP + y * (cell + GAP)) + 'px)';
    }

    function layout() {
      if (!cell) { return; }
      board.style.width = size + 'px';
      board.style.height = size + 'px';
      slots.forEach(function (s, i) {
        s.style.width = cell + 'px';
        s.style.height = cell + 'px';
        place(s, i % N, Math.floor(i / N));
      });
      tiles.forEach(function (t) {
        t.node.style.width = cell + 'px';
        t.node.style.height = cell + 'px';
        place(t.node, t.x, t.y);
        paint(t);
      });
    }

    function move(dirName) {
      if (over) { return; }
      var v = VECTORS[dirName];
      var xs = [0, 1, 2, 3];
      var ys = [0, 1, 2, 3];
      if (v[0] === 1) { xs.reverse(); }
      if (v[1] === 1) { ys.reverse(); }
      var moved = false;
      var merged = {};
      var removed = [];
      tiles.forEach(function (t) { t.node.classList.remove('qa-new', 'qa-merged'); });

      ys.forEach(function (y) {
        xs.forEach(function (x) {
          var t = grid[y][x];
          if (!t) { return; }
          var cx = x;
          var cy = y;
          while (true) {
            var nx = cx + v[0];
            var ny = cy + v[1];
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) { break; }
            var other = grid[ny][nx];
            if (!other) { cx = nx; cy = ny; continue; }
            if (other.value === t.value && !merged[other.id]) {
              // Slide onto the other tile, then it doubles and this one goes away.
              grid[y][x] = null;
              other.value *= 2;
              merged[other.id] = true;
              score += other.value;
              t.x = nx;
              t.y = ny;
              removed.push({ gone: t, into: other });
              moved = true;
              return;
            }
            break;
          }
          if (cx !== x || cy !== y) {
            grid[y][x] = null;
            grid[cy][cx] = t;
            t.x = cx;
            t.y = cy;
            moved = true;
          }
        });
      });

      if (!moved) { return; }
      api.setState('running');
      if (!won) { api.setStatus(''); }
      tiles = tiles.filter(function (t) { return !removed.some(function (r) { return r.gone === t; }); });
      tiles.forEach(function (t) { place(t.node, t.x, t.y); });
      removed.forEach(function (r) {
        place(r.gone.node, r.gone.x, r.gone.y);
        r.gone.node.style.zIndex = '1';
        r.into.node.style.zIndex = '2';
        setTimeout(function () { r.gone.node.remove(); }, 110);
        paint(r.into);
        r.into.node.classList.add('qa-merged');
        if (r.into.value === 2048 && !won) {
          won = true;
          api.setStatus('2048-ton plant online! Keep going for a higher score.', true);
        }
      });
      api.setScore(String(score));
      addRandom();
      layout();
      if (!canMove()) {
        over = true;
        api.setState('over');
        api.setStatus('No moves left at ' + score + ' points.', true);
        api.finish(score);
      }
    }

    function canMove() {
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var t = grid[y][x];
          if (!t) { return true; }
          if (x + 1 < N && grid[y][x + 1] && grid[y][x + 1].value === t.value) { return true; }
          if (y + 1 < N && grid[y + 1][x] && grid[y + 1][x].value === t.value) { return true; }
        }
      }
      return false;
    }

    tiles = [];
    nextId = 1;
    var disconnect = api.observeSize(function (w, h) {
      size = Math.max(160, Math.min(w, h));
      cell = Math.floor((size - GAP * (N + 1)) / N);
      size = cell * N + GAP * (N + 1);
      layout();
    });
    api.onSwipe(board, move);
    reset();

    return {
      onKey: function (e) {
        var d = api.keyDirection(e);
        if (!d) { return false; }
        move(d);
        return true;
      },
      restart: reset,
      redraw: layout,
      destroy: function () {
        over = true;
        disconnect();
      }
    };
  }

  return { create: create };
});
