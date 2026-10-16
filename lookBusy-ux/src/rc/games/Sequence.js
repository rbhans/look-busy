/**
 * Sequence of Ops (Simon): watch the start-up sequence, then repeat it by
 * clicking the equipment or pressing 1-4. Each confirmed sequence adds a step.
 * Score is the longest sequence repeated. Hiding the widget stops playback;
 * the current sequence replays when it comes back.
 */
define([], function () {
  'use strict';

  var SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var UNITS = [
    { tag: 'AHU-1', name: 'Air handler', icon: '<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><circle cx="10.5" cy="8" r="2.5"/><path d="M3.5 6h3"/><path d="M3.5 10h3"/>' },
    { tag: 'CH-1', name: 'Chiller', icon: '<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><circle cx="5.5" cy="8" r="2"/><circle cx="10.5" cy="8" r="2"/>' },
    { tag: 'B-1', name: 'Boiler', icon: '<rect x="3" y="1.5" width="10" height="13" rx="1"/><path d="M8 11.5c-1.6 0-2.5-1-2.5-2.3C5.5 7.5 8 6.3 8 4.5c1.6 1.3 2.5 2.8 2.5 4.7 0 1.3-.9 2.3-2.5 2.3z"/>' },
    { tag: 'P-1', name: 'Pump', icon: '<circle cx="8" cy="8" r="6"/><path d="M6.2 5 11.2 8 6.2 11z"/>' }
  ];

  function create(api) {
    var board = api.el('div', 'qa-board qa-seq');
    board.setAttribute('role', 'group');
    board.setAttribute('aria-label', 'Equipment');
    var buttons = UNITS.map(function (u, i) {
      var b = api.el('button', 'qa-seq-btn');
      b.type = 'button';
      var ic = api.el('span', 'qa-icon');
      ic.innerHTML = SVG + u.icon + '</svg>';
      b.appendChild(ic);
      b.appendChild(api.el('span', null, u.tag));
      b.appendChild(api.el('small', null, u.name + ' · ' + (i + 1)));
      b.addEventListener('click', function () { press(i); });
      board.appendChild(b);
      return b;
    });
    api.wrap.appendChild(board);

    var seq, input, score, state, timers;

    function clearTimers() {
      (timers || []).forEach(clearTimeout);
      timers = [];
      buttons.forEach(function (b) { b.classList.remove('qa-on'); });
    }

    function later(fn, ms) {
      timers.push(setTimeout(fn, ms));
    }

    function reset() {
      clearTimers();
      seq = [];
      input = 0;
      score = 0;
      state = 'ready';
      api.setScore('0');
      api.setState('ready');
      api.setStatus('Press Space or click any unit to start the sequence.');
      enable(true);
    }

    function enable(on) {
      buttons.forEach(function (b) { b.disabled = !on; });
    }

    function begin() {
      seq = [];
      score = 0;
      api.setScore('0');
      api.setState('running');
      next();
    }

    function next() {
      seq.push(Math.floor(Math.random() * UNITS.length));
      later(play, 500);
    }

    function play() {
      clearTimers();
      state = 'watch';
      input = 0;
      enable(false);
      api.setStatus('Watch the sequence: ' + seq.length + (seq.length === 1 ? ' step' : ' steps'));
      var on = Math.max(240, 560 - seq.length * 20);
      var gap = 160;
      seq.forEach(function (u, k) {
        later(function () { buttons[u].classList.add('qa-on'); }, k * (on + gap));
        later(function () { buttons[u].classList.remove('qa-on'); }, k * (on + gap) + on);
      });
      later(function () {
        state = 'input';
        enable(true);
        api.setStatus('Your turn: step 1 of ' + seq.length);
      }, seq.length * (on + gap));
    }

    function flash(i) {
      buttons[i].classList.add('qa-on');
      later(function () { buttons[i].classList.remove('qa-on'); }, 180);
    }

    function press(i) {
      if (api.isSuspended()) { return; }
      if (state === 'ready' || state === 'over') { begin(); return; }
      if (state !== 'input') { return; }
      flash(i);
      if (i !== seq[input]) {
        state = 'over';
        enable(true);
        api.setState('over');
        api.setStatus('Out of sequence at step ' + (input + 1) + ': ' + UNITS[seq[input]].tag + ' was next. ' + score + ' steps.', true);
        api.finish(score);
        return;
      }
      input++;
      if (input < seq.length) {
        api.setStatus('Your turn: step ' + (input + 1) + ' of ' + seq.length);
        return;
      }
      score = seq.length;
      api.setScore(String(score));
      state = 'watch';
      enable(false);
      api.setStatus('Sequence confirmed.');
      next();
    }

    function resize(w, h) {
      var side = Math.max(200, Math.min(w, h, 420));
      board.style.width = side + 'px';
      board.style.height = side + 'px';
    }

    var disconnect = api.observeSize(resize);
    timers = [];
    reset();

    return {
      onKey: function (e) {
        if (/^[1-4]$/.test(e.key)) { press(Number(e.key) - 1); return true; }
        if (e.key === ' ' || e.key === 'Enter') {
          if (state === 'ready' || state === 'over') { begin(); return true; }
        }
        return false;
      },
      restart: function () { reset(); begin(); },
      redraw: function () {},
      suspend: function () {
        if (state === 'watch' || state === 'input') {
          clearTimers();
          state = 'watch';
          enable(false);
          api.setState('paused');
          api.setStatus('Paused. The sequence replays from the top when you come back.');
        }
      },
      unsuspend: function () {
        if (state === 'watch' || state === 'input') {
          api.setState('running');
          // Replay from the top; the operator re-enters the whole sequence.
          later(play, 400);
        }
      },
      destroy: function () {
        clearTimers();
        state = 'over';
        disconnect();
      }
    };
  }

  return { create: create };
});
