/**
 * Fault Finder (minesweeper). The first click is always safe. Right-click or
 * long-press tags a suspected fault; clicking a number whose tags are all
 * placed opens its neighbors. Each difficulty has its own scoreboard (time).
 */
define([], function () {
  'use strict';

  var LEVELS = {
    beginner: { label: 'Beginner', cols: 9, rows: 9, faults: 10, key: 'faultsBeginner' },
    intermediate: { label: 'Intermediate', cols: 16, rows: 16, faults: 40, key: 'faultsIntermediate' }
  };
  var LONG_PRESS_MS = 450;
  var SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var FAULT_ICON = SVG + '<path d="M8 2 14.5 13.5h-13z"/><path d="M8 6.3v3.4"/><path d="M8 11.6v.2"/></svg>';
  // Lockout tag.
  var TAG_ICON = SVG + '<path d="M4 2.5h6.5L13 5v8.5H4z"/><circle cx="8.5" cy="5.5" r="1"/><path d="M6.5 9h4.5"/><path d="M6.5 11.3h3"/></svg>';

  function create(api) {
    var level = LEVELS.beginner;
    var select = api.el('select', 'qa-select');
    select.setAttribute('aria-label', 'Difficulty');
    Object.keys(LEVELS).forEach(function (k) {
      var o = api.el('option', null, LEVELS[k].label);
      o.value = k;
      select.appendChild(o);
    });
    select.addEventListener('change', function () {
      level = LEVELS[select.value];
      api.setBoard(level.key);
      reset();
    });
    api.controls.appendChild(select);

    var board = api.el('div', 'qa-board qa-grid');
    board.setAttribute('role', 'grid');
    board.setAttribute('aria-label', 'Floor plan');
    api.wrap.appendChild(board);

    var clock = api.clock(function (s) { api.setScore(api.formatTime(s)); });
    var cells, seeded, state, opened, tags, avail;
    var press = null;

    function reset() {
      clock.reset();
      board.innerHTML = '';
      board.style.gridTemplateColumns = 'repeat(' + level.cols + ',1fr)';
      cells = [];
      seeded = false;
      state = 'ready';
      opened = 0;
      tags = 0;
      for (var y = 0; y < level.rows; y++) {
        for (var x = 0; x < level.cols; x++) {
          var b = api.el('button', 'qa-cell');
          b.type = 'button';
          b.tabIndex = -1;
          b.setAttribute('aria-label', 'Unchecked');
          var c = { x: x, y: y, fault: false, open: false, tag: false, count: 0, node: b };
          wire(c);
          cells.push(c);
          board.appendChild(b);
        }
      }
      api.setState('ready');
      api.setExtra('Faults', String(level.faults));
      api.setStatus('Click a square to start. Right-click or long-press to tag a fault.');
      size();
    }

    function at(x, y) {
      return x < 0 || y < 0 || x >= level.cols || y >= level.rows ? null : cells[y * level.cols + x];
    }

    function around(c) {
      var out = [];
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          var n = (dx || dy) ? at(c.x + dx, c.y + dy) : null;
          if (n) { out.push(n); }
        }
      }
      return out;
    }

    // Faults go anywhere except the first square and its neighbors.
    function seed(first) {
      var keep = around(first).concat([first]);
      var pool = cells.filter(function (c) { return keep.indexOf(c) < 0; });
      for (var i = 0; i < level.faults && pool.length; i++) {
        var j = Math.floor(Math.random() * pool.length);
        pool[j].fault = true;
        pool.splice(j, 1);
      }
      cells.forEach(function (c) { c.count = around(c).filter(function (n) { return n.fault; }).length; });
      seeded = true;
    }

    function wire(c) {
      c.node.addEventListener('click', function () {
        if (press && press.long) { return; }
        primary(c);
      });
      c.node.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        toggleTag(c);
      });
      c.node.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') { return; }
        press = { long: false, timer: setTimeout(function () { press.long = true; toggleTag(c); }, LONG_PRESS_MS) };
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        c.node.addEventListener(ev, function () {
          if (press) { clearTimeout(press.timer); }
          // Let the click that follows a long press see it, then clear.
          setTimeout(function () { press = null; }, 0);
        });
      });
    }

    function primary(c) {
      if (state === 'won' || state === 'lost' || c.tag) { return; }
      if (!seeded) {
        seed(c);
        state = 'playing';
        clock.start();
        api.setState('running');
        api.setStatus('');
      }
      if (c.open) {
        // Chord: open the neighbors once the right number of tags surround it.
        var ring = around(c);
        if (c.count && ring.filter(function (n) { return n.tag; }).length === c.count) {
          ring.forEach(function (n) { if (!n.tag && !n.open) { reveal(n); } });
        }
      } else {
        reveal(c);
      }
      check();
    }

    function reveal(c) {
      var stack = [c];
      while (stack.length) {
        var cur = stack.pop();
        if (cur.open || cur.tag) { continue; }
        cur.open = true;
        if (cur.fault) {
          cur.node.classList.add('qa-boom');
          state = 'lost';
          paint(cur);
          continue;
        }
        opened++;
        paint(cur);
        if (!cur.count) { stack.push.apply(stack, around(cur)); }
      }
    }

    function toggleTag(c) {
      if (c.open || state === 'won' || state === 'lost') { return; }
      c.tag = !c.tag;
      tags += c.tag ? 1 : -1;
      api.setExtra('Faults', String(level.faults - tags));
      paint(c);
    }

    function paint(c) {
      var n = c.node;
      n.classList.toggle('qa-open', c.open);
      if (c.open && c.fault) {
        n.innerHTML = FAULT_ICON;
        n.setAttribute('aria-label', 'Fault');
      } else if (c.open) {
        n.textContent = c.count ? String(c.count) : '';
        n.setAttribute('aria-label', c.count ? c.count + ' faults nearby' : 'Clear');
      } else if (c.tag) {
        n.innerHTML = TAG_ICON;
        n.setAttribute('aria-label', 'Tagged');
      } else {
        n.textContent = '';
        n.setAttribute('aria-label', 'Unchecked');
      }
    }

    function check() {
      if (state === 'lost') {
        clock.stop();
        cells.forEach(function (c) {
          if (c.fault && !c.tag) { c.open = true; paint(c); }
        });
        api.setState('over');
        api.setStatus('Tripped a fault. Press New game to walk it again.', true);
        return;
      }
      if (state === 'playing' && opened === level.cols * level.rows - level.faults) {
        state = 'won';
        clock.stop();
        var seconds = Math.max(1, Math.round(clock.seconds()));
        api.setScore(api.formatTime(seconds));
        cells.forEach(function (c) { if (c.fault && !c.tag) { c.tag = true; paint(c); } });
        api.setExtra('Faults', '0');
        api.setState('won');
        api.setStatus('Floor cleared in ' + api.formatTime(seconds) + '.', true);
        api.finish(seconds);
      }
    }

    function size() {
      if (!avail) { return; }
      var gap = 2;
      var cell = Math.max(14, Math.floor(Math.min((avail[0] - gap * (level.cols - 1)) / level.cols, (avail[1] - gap * (level.rows - 1)) / level.rows)));
      board.style.width = (cell * level.cols + gap * (level.cols - 1)) + 'px';
      board.style.gridAutoRows = cell + 'px';
      board.style.fontSize = Math.max(10, Math.floor(cell * 0.55)) + 'px';
    }

    var disconnect = api.observeSize(function (w, h) {
      avail = [w, h];
      size();
    });
    api.setBoard(level.key);
    reset();

    return {
      restart: reset,
      redraw: function () {},
      destroy: function () {
        state = 'lost';
        disconnect();
      }
    };
  }

  return { create: create };
});
