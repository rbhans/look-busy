/**
 * Damper Dash (flappy): keep a puff of supply air moving through the open gap
 * in each duct section. Space, Up, click or tap gives it a push. Score is
 * dampers cleared. Physics run in a fixed 360x480 world scaled to fit.
 */
define([], function () {
  'use strict';

  var W = 360;
  var H = 480;
  var FLOOR = 18;
  var PUFF_X = 90;
  var R = 11;
  var GRAVITY = 1400;
  var PUSH = -400;
  var MAX_FALL = 620;
  var DUCT_W = 60;
  var SPACING = 210;

  function create(api) {
    var board = api.el('div', 'qa-board qa-canvas');
    var canvas = api.el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Duct run');
    board.appendChild(canvas);
    api.wrap.appendChild(board);
    var ctx = canvas.getContext('2d');

    var y, vy, ducts, score, state, raf, last, scale, overAt;

    function reset() {
      cancelAnimationFrame(raf);
      y = H / 2 - 40;
      vy = 0;
      ducts = [];
      score = 0;
      state = 'ready';
      api.setScore('0');
      api.setState('ready');
      api.setStatus('Press Space, Up or click to push the air through the dampers.');
      draw();
    }

    function gap() {
      return Math.max(118, 150 - score * 1.5);
    }

    function speed() {
      return Math.min(220, 150 + score * 2.5);
    }

    function addDuct(x) {
      var g = gap();
      var margin = 40 + g / 2;
      ducts.push({ x: x, gapY: margin + Math.random() * (H - FLOOR - 2 * margin), gap: g, passed: false });
    }

    function push() {
      if (state === 'over') {
        if (Date.now() - overAt > 400) { reset(); }
        return;
      }
      if (state !== 'running') {
        var wasReady = state === 'ready';
        state = 'running';
        api.setState('running');
        api.setStatus('');
        if (wasReady) { addDuct(W + 40); }
        last = 0;
        raf = requestAnimationFrame(frame);
        if (!wasReady) { return; }
      }
      vy = PUSH;
    }

    function pause() {
      if (state !== 'running') { return; }
      cancelAnimationFrame(raf);
      state = 'paused';
      api.setState('paused');
      api.setStatus('Paused. Press Space, Up or click to continue');
      draw();
    }

    function frame(t) {
      if (state !== 'running') { return; }
      var dt = last ? Math.min(0.033, (t - last) / 1000) : 0;
      last = t;
      vy = Math.min(MAX_FALL, vy + GRAVITY * dt);
      y += vy * dt;
      if (y < R) { y = R; vy = 0; }
      var v = speed();
      ducts.forEach(function (d) { d.x -= v * dt; });
      if (ducts.length && ducts[0].x < -DUCT_W) { ducts.shift(); }
      if (!ducts.length || ducts[ducts.length - 1].x < W - SPACING) { addDuct(W + 10); }
      ducts.forEach(function (d) {
        if (!d.passed && d.x + DUCT_W < PUFF_X - R) {
          d.passed = true;
          score++;
          api.setScore(String(score));
        }
      });
      if (y + R >= H - FLOOR || ducts.some(hits)) {
        crash();
        return;
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function circleHitsRect(rx, ry, rw, rh) {
      var nx = Math.max(rx, Math.min(PUFF_X, rx + rw));
      var ny = Math.max(ry, Math.min(y, ry + rh));
      return Math.hypot(PUFF_X - nx, y - ny) < R;
    }

    // The puff against the duct sections above and below the gap.
    function hits(d) {
      var top = d.gapY - d.gap / 2;
      var bottom = d.gapY + d.gap / 2;
      return circleHitsRect(d.x, 0, DUCT_W, top) || circleHitsRect(d.x, bottom, DUCT_W, H - FLOOR - bottom);
    }

    function crash() {
      state = 'over';
      overAt = Date.now();
      api.setState('over');
      api.setStatus('Hit a damper after ' + score + (score === 1 ? ' section.' : ' sections.') + ' Press New game or Space to go again.', true);
      draw();
      api.finish(score);
    }

    function section(x, y0, y1, c, end) {
      var h = y1 - y0;
      if (h <= 0) { return; }
      ctx.fillStyle = api.rgba(c.text, 0.09);
      ctx.fillRect(x, y0, DUCT_W, h);
      ctx.strokeStyle = api.rgba(c.text, 0.35);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 0.75, y0 + 0.75, DUCT_W - 1.5, h - 1.5);
      // Damper blades.
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y0, DUCT_W, h);
      ctx.clip();
      ctx.strokeStyle = api.rgba(c.text, 0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (var by = y0 - DUCT_W; by < y1; by += 16) {
        ctx.moveTo(x + 6, by + DUCT_W - 6);
        ctx.lineTo(x + DUCT_W - 6, by + 6);
      }
      ctx.stroke();
      ctx.restore();
      // Flange at the open end.
      ctx.fillStyle = api.rgba(c.text, 0.35);
      ctx.fillRect(x - 4, end - (end === y1 ? 8 : 0), DUCT_W + 8, 8);
    }

    function draw() {
      if (!scale || !ducts) { return; }
      var c = api.colors();
      var dpr = canvas.width / (W * scale);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.fillStyle = api.rgba(c.text, 0.04);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = api.rgba(c.text, 0.12);
      ctx.fillRect(0, H - FLOOR, W, FLOOR);

      var dim = state === 'over' ? 0.55 : 1;
      ctx.globalAlpha = dim;
      ducts.forEach(function (d) {
        var top = d.gapY - d.gap / 2;
        var bottom = d.gapY + d.gap / 2;
        section(d.x, 0, top, c, top);
        section(d.x, bottom, H - FLOOR, c, bottom);
      });
      ctx.globalAlpha = 1;

      // The puff: a filled circle with airflow streaks behind it.
      var tilt = Math.max(-0.5, Math.min(0.9, vy / 600));
      ctx.save();
      ctx.translate(PUFF_X, y);
      ctx.rotate(tilt);
      ctx.strokeStyle = api.rgba(c.accent, 0.5 * dim);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      [-6, 0, 6].forEach(function (o, i) {
        ctx.moveTo(-R - 4, o);
        ctx.lineTo(-R - 12 - (i === 1 ? 8 : 2), o);
      });
      ctx.stroke();
      ctx.fillStyle = api.rgba(c.accent, dim);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    var disconnect = api.observeSize(function (w, h) {
      scale = Math.max(0.4, Math.min(w / W, h / H));
      var dpr = window.devicePixelRatio || 1;
      canvas.style.width = Math.round(W * scale) + 'px';
      canvas.style.height = Math.round(H * scale) + 'px';
      canvas.width = Math.round(W * scale * dpr);
      canvas.height = Math.round(H * scale * dpr);
      draw();
    });

    board.addEventListener('pointerdown', function (e) {
      if (e.button === 0 || e.pointerType !== 'mouse') { push(); }
    });
    var frameEl = api.wrap.closest('.qa-frame');
    var onBlur = function () { setTimeout(function () { if (!api.isFocused()) { pause(); } }, 0); };
    frameEl.addEventListener('focusout', onBlur);

    reset();

    return {
      onKey: function (e) {
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          if (!e.repeat) { push(); }
          return true;
        }
        if ((e.key === 'p' || e.key === 'P') && state === 'running') { pause(); return true; }
        return false;
      },
      restart: reset,
      redraw: draw,
      suspend: pause,
      destroy: function () {
        cancelAnimationFrame(raf);
        state = 'over';
        disconnect();
        frameEl.removeEventListener('focusout', onBlur);
      }
    };
  }

  return { create: create };
});
