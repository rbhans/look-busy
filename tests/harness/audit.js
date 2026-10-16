/*
 * Color audit for the lookBusy harness (not packaged). Same checks as QAGSite's audit.js.
 *
 * qaAudit() checks every visible text in the widgets: its color composited over everything
 * actually behind it (ancestor and inline tile backgrounds, the page under see-through
 * layers) against 4.5:1, or 3:1 for large text (>= 24px, or >= 18.66px bold).
 *
 * qaSources(probe) sets every widget's textColor to a probe color and lists every visible
 * text whose color did not follow it. Alarm/overridden status pills are exempt (Niagara lexicon pairs).
 */
(function () {
  'use strict';

  function noTransitions() {
    if (document.getElementById('qa-audit-style')) { return; }
    var st = document.createElement('style');
    st.id = 'qa-audit-style';
    st.textContent = '.host *, .host *::before, .host *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(st);
  }

  function parse(c) {
    var m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) { return null; }
    var p = m[1].split(',').map(parseFloat);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }

  function over(top, bottom) {
    var a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
  }

  function lum(c) {
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
  }

  function ratio(a, b) {
    var x = lum(a);
    var y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function hex(c) {
    return '#' + c.slice(0, 3).map(function (v) { var h = Math.round(v).toString(16); return h.length < 2 ? '0' + h : h; }).join('');
  }

  // Background actually behind el: composite ancestors' backgrounds bottom-up over the page.
  function backdrop(el) {
    var chain = [];
    for (var e = el; e && e !== document.documentElement; e = e.parentElement) { chain.push(e); }
    var bg = [233, 236, 239, 1];
    for (var i = chain.length - 1; i >= 0; i--) {
      var c = parse(getComputedStyle(chain[i]).backgroundColor);
      if (c && c[3] > 0) { bg = over(c, bg); }
    }
    return bg;
  }

  function texts() {
    var out = [];
    document.querySelectorAll('.host *').forEach(function (el) {
      if (el.tagName === 'OPTION' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') { return; }
      var own = Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
      if (!own || !el.getClientRects().length) { return; }
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') { return; }
      out.push(el);
    });
    return out;
  }

  window.qaAudit = function () {
    noTransitions();
    var fails = [];
    var checked = 0;
    texts().forEach(function (el) {
      var cs = getComputedStyle(el);
      var bg = backdrop(el);
      var fg = over(parse(cs.color), bg);
      var size = parseFloat(cs.fontSize);
      var bold = parseInt(cs.fontWeight, 10) >= 700;
      var need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      var r = ratio(fg, bg);
      checked++;
      if (r < need) { fails.push({ text: el.textContent.trim().slice(0, 30), cls: el.className, fg: hex(fg), bg: hex(bg), ratio: +r.toFixed(2), need: need }); }
    });
    return { checked: checked, fails: fails };
  };

  window.qaSources = function (probe) {
    noTransitions();
    probe = probe || '#c000c0';
    var p = parse('rgb(' + [1, 3, 5].map(function (i) { return parseInt(probe.substr(i, 2), 16); }).join(',') + ')');
    return Promise.all(window.widgets.map(function (w) { return w.properties().setValue('textColor', probe); })).then(function () {
      var stray = [];
      texts().forEach(function (el) {
        // Status pills use Niagara's lexicon status pairs on purpose.
        if (el.matches('.qa-pill[data-status="alarm"], .qa-pill[data-status="overridden"]')) { return; }
        var c = parse(getComputedStyle(el).color);
        if (!c || c[0] !== p[0] || c[1] !== p[1] || c[2] !== p[2]) {
          stray.push({ text: el.textContent.trim().slice(0, 30), cls: el.className, color: getComputedStyle(el).color });
        }
      });
      return stray;
    });
  };
})();
