/**
 * Shared base for the lookBusy widgets: theme properties, the scoreboards
 * (station LookBusy component or this browser), the game frame (header with
 * status pill, board, status line), the scoreboard panel and collapse.
 * Game logic lives in rc/games/*.
 */
define([
  'baja!',
  'lex!baja',
  'bajaux/Widget',
  'bajaux/mixin/subscriberMixIn',
  'nmodule/lookBusy/rc/games/DuctRun',
  'nmodule/lookBusy/rc/games/Tonnage',
  'nmodule/lookBusy/rc/games/FaultFinder',
  'nmodule/lookBusy/rc/games/PipeFitter',
  'nmodule/lookBusy/rc/games/Sequence',
  'nmodule/lookBusy/rc/games/AfterHours',
  'nmodule/lookBusy/rc/games/PanelBuild',
  'nmodule/lookBusy/rc/games/DamperDash'
], function (baja, bajaLex, Widget, subscriberMixIn, DuctRun, Tonnage, FaultFinder, PipeFitter, Sequence, AfterHours, PanelBuild, DamperDash) {
  'use strict';

  var LOOK_BUSY_TYPE = 'lookBusy:LookBusy';
  var BOARD_SIZE = 10;

  // Each board is the LookBusy property <key>Scores. Timed boards rank the fastest first.
  var BOARDS = {
    ductRun: { label: 'Duct Run', unit: 'diffusers' },
    tonnage: { label: 'Tonnage', unit: 'pts' },
    faultsBeginner: { label: 'Beginner', time: true },
    faultsIntermediate: { label: 'Intermediate', time: true },
    pipeFitter: { label: 'Pipe Fitter', time: true },
    sequence: { label: 'Sequence of Ops', unit: 'steps' },
    afterHours: { label: 'After Hours', time: true },
    panelBuild: { label: 'Panel Build', unit: 'pts' },
    damperDash: { label: 'Damper Dash', unit: 'sections' }
  };

  var GAMES = {
    ductRun: { title: 'Duct Run', icon: 'duct', module: DuctRun, boards: ['ductRun'],
      objective: 'Run duct to each diffuser without crossing your own run.' },
    tonnage: { title: 'Tonnage', icon: 'chiller', module: Tonnage, boards: ['tonnage'],
      objective: 'Slide and merge equipment up to a 2048-ton plant.' },
    faults: { title: 'Fault Finder', icon: 'fault', module: FaultFinder, boards: ['faultsBeginner', 'faultsIntermediate'],
      objective: 'Clear the floor without tripping a fault. Right-click or long-press to tag one.' },
    pipeFitter: { title: 'Pipe Fitter', icon: 'pump', module: PipeFitter, boards: ['pipeFitter'],
      objective: 'Turn fittings until every coil is on the pump loop.' },
    sequence: { title: 'Sequence of Ops', icon: 'sequence', module: Sequence, boards: ['sequence'],
      objective: 'Repeat the start-up sequence as it grows.' },
    afterHours: { title: 'After Hours', icon: 'light', module: AfterHours, boards: ['afterHours'],
      objective: 'Switch every lighting zone off. Each switch flips its neighbors too.' },
    panelBuild: { title: 'Panel Build', icon: 'panel', module: PanelBuild, boards: ['panelBuild'],
      objective: 'Fit falling I/O modules onto the DIN rails. A full rail clears.' },
    damperDash: { title: 'Damper Dash', icon: 'damper', module: DamperDash, boards: ['damperDash'],
      objective: 'Push a puff of supply air through the open dampers.' }
  };
  var ORDER = ['ductRun', 'damperDash', 'panelBuild', 'tonnage', 'faults', 'pipeFitter', 'sequence', 'afterHours'];

  // 16px line icons, drawn in the text color.
  var ICONS = {
    duct: '<path d="M1.5 5.5h7a4 4 0 0 1 4 4v5"/><path d="M1.5 9.5h5a2 2 0 0 1 2 2v3"/><path d="M4.5 5.5v4"/>',
    chiller: '<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><circle cx="5.5" cy="8" r="2"/><circle cx="10.5" cy="8" r="2"/>',
    fault: '<path d="M8 2 14.5 13.5h-13z"/><path d="M8 6.5v3.2"/><path d="M8 11.5v.2"/>',
    pump: '<circle cx="8" cy="8" r="6"/><path d="M6.2 5 11.2 8 6.2 11z"/>',
    sequence: '<path d="M6 4h8.5"/><path d="M6 8h8.5"/><path d="M6 12h8.5"/><path d="M2 3.5v1"/><path d="M2 7.5v1"/><path d="M2 11.5v1"/>',
    light: '<path d="M5.4 10.2a4.6 4.6 0 1 1 5.2 0v1.8H5.4z"/><path d="M6.4 14.3h3.2"/>',
    panel: '<rect x="2.5" y="1.5" width="11" height="13" rx="1"/><path d="M2.5 5.5h11"/><path d="M2.5 10.5h11"/><path d="M5 3.5h2"/><path d="M5 8h4"/><path d="M5 12.5h3"/>',
    damper: '<rect x="1.5" y="3.5" width="13" height="9" rx="1"/><path d="M4 10.5 7 5.5"/><path d="M7.5 10.5l3-5"/><path d="M11 10.5l2-3.3"/>',
    minimize: '<path d="M3.5 8h9"/>',
    back: '<path d="M10 3.5 5.5 8l4.5 4.5"/>'
  };

  function icon(name) {
    var span = document.createElement('span');
    span.className = 'qa-icon';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
    return span;
  }

  var STYLE_ID = 'lookbusy-styles';
  var STYLES = [
    '.qa-root{box-sizing:border-box;position:relative;width:100%;height:100%;min-height:0;overflow:hidden;',
    'background:var(--qa-bg);color:var(--qa-text);font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;outline:none;user-select:none;-webkit-user-select:none}',
    '.qa-root *{box-sizing:border-box}',
    '.qa-root:focus-visible{box-shadow:inset 0 0 0 2px var(--qa-accent)}',
    '.qa-frame{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;flex-direction:column;padding:10px}',
    '.qa-icon{display:inline-flex;flex:none}',
    '.qa-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:26px;margin-bottom:8px}',
    '.qa-title{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;margin-right:2px;white-space:nowrap}',
    '.qa-pill{display:inline-flex;align-items:center;height:20px;padding:0 8px;border:1px solid var(--qa-line);border-radius:10px;font-size:11px;white-space:nowrap}',
    '.qa-stat{display:flex;align-items:baseline;gap:4px;white-space:nowrap}',
    '.qa-stat-label{font-size:11px;color:var(--qa-muted)}',
    '.qa-stat-value{font-weight:600;font-variant-numeric:tabular-nums}',
    '.qa-spacer{flex:1}',
    '.qa-btn,.qa-select{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:26px;padding:0 10px;border:1px solid var(--qa-line);border-radius:6px;',
    'background:transparent;color:var(--qa-text);font:inherit;white-space:nowrap;cursor:pointer}',
    '.qa-btn.qa-icon-btn{width:26px;padding:0}',
    '.qa-btn:hover,.qa-select:hover{background:var(--qa-soft)}',
    '.qa-btn:focus-visible,.qa-select:focus-visible{outline:2px solid var(--qa-accent);outline-offset:1px}',
    '.qa-select option{color:#1f2933;background:#ffffff}',
    '.qa-body{position:relative;flex:1;min-height:0;display:flex}',
    '.qa-board-wrap{flex:1;min-width:0;min-height:0;display:flex;align-items:center;justify-content:center}',
    '.qa-board{position:relative;touch-action:none}',
    '.qa-status{min-height:17px;margin-top:8px;font-size:11px;color:var(--qa-muted);text-align:center}',
    '.qa-status[data-tone="strong"]{color:var(--qa-text);font-weight:600}',
    '.qa-note{font-size:11px;color:var(--qa-muted);text-align:center;margin-top:2px}',
    '.qa-note:empty{display:none}',
    // Tables: menu and scoreboard
    '.qa-scroll{flex:1;min-height:0;overflow:auto;border:1px solid var(--qa-line);border-radius:6px}',
    // Hug the rows; scroll only when they don't fit.
    '.qa-body>.qa-scroll{align-self:flex-start;max-height:100%}',
    '.qa-panel .qa-scroll{flex:0 1 auto}',
    '.qa-panel .qa-table th:nth-child(1){width:36px}',
    '.qa-panel .qa-table th:nth-child(2){width:120px}',
    '.qa-table{width:100%;border-collapse:collapse}',
    '.qa-table th{position:sticky;top:0;background:var(--qa-bg);padding:7px 10px;text-align:left;font-size:11px;font-weight:600;color:var(--qa-muted);',
    'border-bottom:1px solid var(--qa-line);white-space:nowrap}',
    '.qa-table td{padding:8px 10px;border-bottom:1px solid var(--qa-soft);vertical-align:middle}',
    '.qa-table tr:last-child td{border-bottom:0}',
    '.qa-table .qa-num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.qa-table .qa-muted{color:var(--qa-muted)}',
    '.qa-table .qa-clip{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.qa-row{cursor:pointer}',
    '.qa-row:hover td{background:var(--qa-soft)}',
    '.qa-row-mine td{background:var(--qa-soft);font-weight:600}',
    '.qa-link{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:0;border:0;background:none;color:var(--qa-text);font:inherit;font-weight:600;cursor:pointer}',
    '.qa-link:focus-visible{outline:2px solid var(--qa-accent);outline-offset:2px;border-radius:2px}',
    '.qa-narrow .qa-wide{display:none}',
    '.qa-panel{position:absolute;top:0;right:0;bottom:0;left:0;z-index:10;display:flex;flex-direction:column;gap:8px;background:var(--qa-bg)}',
    '.qa-board-wrap{isolation:isolate}',
    '.qa-panel-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.qa-panel-title{font-size:13px;font-weight:600}',
    '.qa-empty{padding:16px;text-align:center;color:var(--qa-muted)}',
    // Collapsed: see-through, only the restore button takes clicks.
    '.qa-root.qa-collapsed{background:transparent;pointer-events:none;box-shadow:none}',
    '.qa-root.qa-collapsed .qa-frame{display:none}',
    '.qa-restore{display:none;position:absolute;top:6px;right:6px;pointer-events:auto;background:var(--qa-bg)}',
    '.qa-root.qa-collapsed .qa-restore{display:inline-flex}',
    // Duct Run
    '.qa-canvas canvas{display:block;border-radius:6px}',
    // Tonnage
    '.qa-tiles{border-radius:6px;background:var(--qa-soft)}',
    '.qa-tile-slot{position:absolute;border-radius:5px;background:var(--qa-cell)}',
    '.qa-tile{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:5px;font-weight:700;line-height:1.05;',
    'color:var(--qa-text);font-variant-numeric:tabular-nums;transition:transform 100ms ease-out}',
    '.qa-tile small{font-size:.42em;font-weight:600;letter-spacing:.04em}',
    '.qa-tile.qa-new{animation:qa-pop 140ms ease-out}',
    '.qa-tile.qa-merged{animation:qa-bump 140ms ease-out}',
    '@keyframes qa-pop{from{opacity:0;scale:.6}to{opacity:1;scale:1}}',
    '@keyframes qa-bump{50%{scale:1.1}}',
    // Cell grids: Fault Finder, After Hours
    '.qa-grid{display:grid;gap:2px}',
    '.qa-cell{display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:3px;background:var(--qa-cell);color:var(--qa-text);',
    'font:inherit;font-weight:700;line-height:1;cursor:pointer}',
    '.qa-cell:hover{background:var(--qa-cell-hover)}',
    '.qa-cell.qa-open{background:transparent;box-shadow:inset 0 0 0 1px var(--qa-soft);cursor:default}',
    '.qa-cell.qa-boom{background:var(--qa-boom)}',
    '.qa-cell.qa-lit{background:var(--qa-lit);box-shadow:inset 0 0 0 1px var(--qa-accent)}',
    '.qa-cell:focus-visible{outline:2px solid var(--qa-accent);outline-offset:-2px}',
    '.qa-cell svg{width:62%;height:62%}',
    // Sequence of Ops
    '.qa-seq{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.qa-seq-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px solid var(--qa-line);border-radius:6px;',
    'background:transparent;color:var(--qa-text);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background 80ms}',
    '.qa-seq-btn small{font-size:11px;font-weight:400;color:var(--qa-muted)}',
    '.qa-seq-btn:hover{background:var(--qa-soft)}',
    '.qa-seq-btn.qa-on{background:var(--qa-lit);border-color:var(--qa-accent)}',
    // Muted text loses contrast on the lit fill; use the full text color there.
    '.qa-seq-btn.qa-on small{color:var(--qa-text)}',
    '.qa-seq-btn:disabled{cursor:default}',
    '.qa-seq-btn:focus-visible{outline:2px solid var(--qa-accent);outline-offset:1px}',
    '.qa-seq-btn .qa-icon svg{width:22px;height:22px}',
    '@media (prefers-reduced-motion: reduce){.qa-tile{transition:none}.qa-tile.qa-new,.qa-tile.qa-merged{animation:none}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) { return; }
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function button(cls, text, label) {
    var b = el('button', cls, text);
    b.type = 'button';
    if (label) { b.setAttribute('aria-label', label); b.title = label; }
    return b;
  }

  var probe = null;

  /** Any color value (baja Color, #rgb, #rrggbb, Niagara #aarrggbb, css text) to [r, g, b, a]. */
  function parseColor(value, fallback) {
    if (value && typeof value === 'object') {
      value = value.encodeToString ? value.encodeToString() : String(value);
    }
    var str = String(value == null ? '' : value).trim().replace(/^color:/, '');
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(str);
    if (m) {
      var h = m[1];
      if (h.length === 3) { h = h.replace(/./g, '$&$&'); }
      var a = 1;
      if (h.length === 8) { a = parseInt(h.slice(0, 2), 16) / 255; h = h.slice(2); }
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), a];
    }
    if (str && str !== 'null') {
      probe = probe || document.createElement('canvas').getContext('2d');
      probe.fillStyle = '#010203';
      probe.fillStyle = str;
      var out = probe.fillStyle;
      if (out !== '#010203' || /^#?010203$/i.test(str)) {
        if (out.charAt(0) === '#') { return parseColor(out, fallback); }
        var p = /rgba?\(([^)]+)\)/.exec(out);
        if (p) {
          var parts = p[1].split(',').map(parseFloat);
          return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
        }
      }
    }
    return fallback;
  }

  function rgba(c, alpha) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (alpha == null ? c[3] : alpha * c[3]) + ')';
  }

  // Niagara status colors from the baja lexicon, so station overrides carry over (N4.15 defaults as fallback).
  var lexicon = Array.isArray(bajaLex) ? bajaLex[0] : bajaLex;
  function lexColor(key, fallback) {
    try {
      var v = lexicon && lexicon.get ? lexicon.get(key) : null;
      return rgba(parseColor(v, parseColor(fallback)));
    } catch (e) {
      return rgba(parseColor(fallback));
    }
  }
  var STATUS = {
    overridden: { bg: lexColor('Status.overridden.bg', '#BFADDD'), fg: lexColor('Status.overridden.fg', '#333333') },
    alarm: { bg: lexColor('Status.alarm.bg', '#CF1624'), fg: lexColor('Status.alarm.fg', '#FFFFFF') }
  };
  var STATES = {
    ready: { label: 'Ready' },
    running: { label: 'Running' },
    paused: { label: 'Paused', status: 'overridden' },
    over: { label: 'Game over', status: 'alarm' },
    won: { label: 'Complete' }
  };

  function numberOf(v) {
    var n = Number(v && v.valueOf ? v.valueOf() : v);
    return isFinite(n) ? n : 0;
  }

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    return Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2);
  }

  function formatValue(key, value) {
    return BOARDS[key] && BOARDS[key].time ? formatTime(value) : String(value);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  /** "value user yyyy-mm-dd | ..." (BLookBusy's encoding) to rows, best first. */
  function decodeBoard(text) {
    var rows = [];
    String(text == null ? '' : text).split('|').forEach(function (part) {
      var m = /^(\d+) (.+) (\d{4}-\d{2}-\d{2})$/.exec(part.trim());
      if (m) { rows.push({ value: Number(m[1]), user: m[2], date: m[3] }); }
    });
    return rows;
  }

  function better(key, a, b) {
    return BOARDS[key].time ? a < b : a > b;
  }

  /** Scoreboards from a station LookBusy component when one is set, otherwise from this browser. */
  class ScoreStore {
    constructor() {
      this.component = null;
    }

    isShared() {
      return !!this.component;
    }

    rows(key) {
      if (this.component) {
        try { return decodeBoard(this.component.get(key + 'Scores')); } catch (e) { return []; }
      }
      try {
        var saved = JSON.parse(window.localStorage.getItem('lookBusy.board.' + key) || '[]');
        return Array.isArray(saved) ? saved.filter(function (r) { return r && typeof r.value === 'number'; }) : [];
      } catch (e) {
        return [];
      }
    }

    best(key) {
      return this.rows(key)[0] || null;
    }

    /** Resolves the 1-based rank of the run, or 0 when it didn't place. */
    submit(key, value) {
      value = Math.round(value);
      if (!(value > 0)) { return Promise.resolve(0); }
      if (this.component) {
        return this.component.invoke({ slot: 'submitScore', value: key + ':' + value }).then(function (rank) {
          return Number(String(rank == null ? '' : rank)) || 0;
        });
      }
      var rows = this.rows(key);
      var rank = 0;
      while (rank < rows.length && !better(key, value, rows[rank].value)) { rank++; }
      if (rank >= BOARD_SIZE) { return Promise.resolve(0); }
      var user = '';
      try { user = baja.getUserName ? String(baja.getUserName() || '') : ''; } catch (ignored) {}
      rows.splice(rank, 0, { value: value, user: user || 'you', date: today() });
      try {
        window.localStorage.setItem('lookBusy.board.' + key, JSON.stringify(rows.slice(0, BOARD_SIZE)));
      } catch (ignored) {}
      return Promise.resolve(rank + 1);
    }
  }

  function isLookBusy(value) {
    try {
      return !!(value && value.getType && value.getType().is(LOOK_BUSY_TYPE));
    } catch (e) {
      return false;
    }
  }

  /** Elapsed-time clock that stops while the widget is collapsed or the scoreboard covers the board. */
  function makeClock(onTick) {
    var acc = 0;
    var since = 0;
    var running = false;
    var held = false;
    var timer = null;
    function ms() { return acc + (since ? Date.now() - since : 0); }
    function sync() {
      var go = running && !held;
      if (go && !since) {
        since = Date.now();
        timer = setInterval(function () { onTick(ms() / 1000); }, 250);
      } else if (!go && since) {
        acc += Date.now() - since;
        since = 0;
        clearInterval(timer);
        timer = null;
      }
    }
    return {
      start: function () { running = false; sync(); acc = 0; running = true; sync(); onTick(0); },
      stop: function () { running = false; sync(); },
      reset: function () { running = false; sync(); acc = 0; onTick(0); },
      hold: function (h) { held = h; sync(); },
      seconds: function () { return ms() / 1000; }
    };
  }

  /**
   * Base widget. Subclasses set this.fixedGame to a GAMES key; without one the
   * widget opens on the game menu (LookBusyView).
   */
  class GameWidget extends Widget {
    constructor(params) {
      super({
        params: params,
        defaults: {
          properties: {
            lookBusyOrd: { value: '', typeSpec: 'baja:Ord' },
            startCollapsed: { value: false, typeSpec: 'baja:Boolean' },
            backgroundColor: { value: '#ffffff', typeSpec: 'gx:Color' },
            textColor: { value: '#1f2933', typeSpec: 'gx:Color' },
            accentColor: { value: '#5470c6', typeSpec: 'gx:Color' }
          }
        }
      });
      subscriberMixIn(this);
      this.fixedGame = null;
      this.store = new ScoreStore();
      this.generation = 0;
      this.destroyed = false;
      this.game = null;
      this.gameId = null;
      this.clocks = [];
      this.ordTarget = null;
      this.loadNote = '';
      this.collapsed = false;
      this.panel = null;
      this.lastRank = null;
    }

    doInitialize(dom) {
      var that = this;
      injectStyles();
      this.root = dom[0];
      this.root.innerHTML = '';
      this.root.classList.add('qa-root');
      this.root.tabIndex = 0;
      this.frame = el('div', 'qa-frame');
      this.restoreBtn = button('qa-btn qa-restore');
      this.restoreBtn.addEventListener('click', function () { that.setCollapsed(false); });
      this.root.appendChild(this.frame);
      this.root.appendChild(this.restoreBtn);
      this.applyTheme();

      this.onKey = function (e) {
        if (e.key === 'Escape' && !that.collapsed) {
          // Boss key.
          that.setCollapsed(true);
          e.preventDefault();
          return;
        }
        if (that.collapsed || that.panel || /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) { return; }
        if (that.game && that.game.onKey && that.game.onKey(e)) { e.preventDefault(); }
      };
      this.onPointerDown = function () {
        if (!that.collapsed && !that.root.contains(document.activeElement)) { that.root.focus({ preventScroll: true }); }
      };
      this.root.addEventListener('keydown', this.onKey);
      this.root.addEventListener('pointerdown', this.onPointerDown);
      this.resizeObserver = window.ResizeObserver ? new window.ResizeObserver(function () {
        that.root.classList.toggle('qa-narrow', that.root.clientWidth < 560);
      }) : null;
      if (this.resizeObserver) { this.resizeObserver.observe(this.root); }

      this.getSubscriber().attach('changed', function (prop) {
        var name = prop && prop.getName ? prop.getName() : '';
        if (/Scores$/.test(name) && this === that.store.component) { that.refreshScores(); }
      });

      if (this.fixedGame) { this.showGame(this.fixedGame); } else { this.showMenu(); }
      if (this.properties().getValue('startCollapsed') === true || String(this.properties().getValue('startCollapsed')) === 'true') {
        this.setCollapsed(true);
      }
      // An unbound Px WebWidget never gets doLoad: start from the lookBusyOrd property.
      return this.loadTarget(null);
    }

    doLoad(value) {
      return this.loadTarget(value);
    }

    doChanged(name) {
      if (!this.root) { return; }
      if (name === 'lookBusyOrd') { return this.loadTarget(this.value()); }
      if (/Color$/.test(name)) {
        this.applyTheme();
        if (this.game && this.game.redraw) { this.game.redraw(); }
      }
    }

    doDestroy() {
      this.destroyed = true;
      this.generation++;
      this.unmountGame();
      if (this.resizeObserver) { this.resizeObserver.disconnect(); }
      if (this.root) {
        this.root.removeEventListener('keydown', this.onKey);
        this.root.removeEventListener('pointerdown', this.onPointerDown);
        this.root.innerHTML = '';
      }
    }

    /** LookBusy from the lookBusyOrd property wins; otherwise the loaded value if it is a LookBusy. */
    loadTarget(value) {
      var that = this;
      var gen = ++this.generation;
      var raw = this.properties().getValue('lookBusyOrd');
      var ord = raw == null ? '' : String(raw).trim();
      if (ord === 'null') { ord = ''; }
      var previous = this.ordTarget;
      this.ordTarget = null;
      if (previous && previous !== value) { this.getSubscriber().unsubscribe(previous).catch(function () {}); }

      if (!ord) {
        this.store.component = isLookBusy(value) ? value : null;
        this.loadNote = value && !isLookBusy(value) ? 'The bound value is not a LookBusy component; scores are kept in this browser.' : '';
        this.refreshScores();
        return Promise.resolve();
      }
      return baja.Ord.make(ord).get({ subscriber: this.getSubscriber() }).then(function (target) {
        if (that.destroyed || gen !== that.generation) { return; }
        that.ordTarget = target;
        that.store.component = isLookBusy(target) ? target : null;
        that.loadNote = isLookBusy(target) ? '' : 'lookBusyOrd is not a LookBusy component; scores are kept in this browser.';
        that.refreshScores();
      }, function (err) {
        if (that.destroyed || gen !== that.generation) { return; }
        that.store.component = null;
        that.loadNote = 'Could not open lookBusyOrd (' + (err && err.message ? err.message : err) + '); scores are kept in this browser.';
        that.refreshScores();
      });
    }

    applyTheme() {
      var props = this.properties();
      var bg = parseColor(props.getValue('backgroundColor'), [255, 255, 255, 1]);
      var text = parseColor(props.getValue('textColor'), [31, 41, 51, 1]);
      var accent = parseColor(props.getValue('accentColor'), [84, 112, 198, 1]);
      this.colors = { bg: bg, text: text, accent: accent };
      var s = this.root.style;
      s.setProperty('--qa-bg', rgba(bg));
      s.setProperty('--qa-text', rgba(text));
      s.setProperty('--qa-muted', rgba(text, 0.72));
      s.setProperty('--qa-line', rgba(text, 0.18));
      s.setProperty('--qa-soft', rgba(text, 0.05));
      s.setProperty('--qa-cell', rgba(text, 0.1));
      s.setProperty('--qa-cell-hover', rgba(text, 0.16));
      s.setProperty('--qa-accent', rgba(accent));
      s.setProperty('--qa-lit', rgba(accent, 0.4));
      s.setProperty('--qa-boom', STATUS.alarm.bg.replace(/,[\d.]+\)$/, ',0.35)'));
    }

    // ---- Collapse and suspend ----

    setCollapsed(collapsed) {
      this.collapsed = collapsed;
      this.root.classList.toggle('qa-collapsed', collapsed);
      this.updateRestore();
      this.updateSuspend();
      if (collapsed) {
        this.restoreBtn.focus({ preventScroll: true });
      } else {
        this.root.focus({ preventScroll: true });
      }
    }

    updateRestore() {
      var g = this.gameId ? GAMES[this.gameId] : null;
      this.restoreBtn.innerHTML = '';
      this.restoreBtn.appendChild(icon(g ? g.icon : 'sequence'));
      this.restoreBtn.appendChild(document.createTextNode(g ? g.title : 'Look Busy'));
      this.restoreBtn.title = 'Show';
    }

    /** The game pauses (and its clocks hold) while collapsed or while the scoreboard covers it. */
    updateSuspend() {
      var suspended = this.collapsed || !!this.panel;
      if (suspended === !!this.suspended) { return; }
      this.suspended = suspended;
      this.clocks.forEach(function (c) { c.hold(suspended); });
      if (this.game) {
        if (suspended && this.game.suspend) { this.game.suspend(); }
        if (!suspended && this.game.unsuspend) { this.game.unsuspend(); }
      }
    }

    // ---- Frames ----

    clearFrame() {
      this.unmountGame();
      this.closePanel(true);
      this.frame.innerHTML = '';
      this.scoreCells = [];
      this.bestStat = null;
    }

    unmountGame() {
      this.clocks.forEach(function (c) { c.stop(); });
      this.clocks = [];
      if (this.game) {
        try { this.game.destroy(); } catch (ignored) {}
      }
      this.game = null;
      this.gameId = null;
    }

    minimizeButton() {
      var that = this;
      var b = button('qa-btn qa-icon-btn', null, 'Hide (Esc)');
      b.appendChild(icon('minimize'));
      b.addEventListener('click', function () { that.setCollapsed(true); });
      return b;
    }

    showMenu() {
      var that = this;
      this.clearFrame();
      var head = el('div', 'qa-head');
      var title = el('div', 'qa-title', 'Look Busy');
      head.appendChild(title);
      head.appendChild(el('div', 'qa-spacer'));
      head.appendChild(this.minimizeButton());

      var body = el('div', 'qa-body');
      this.body = body;
      var scroll = el('div', 'qa-scroll');
      var table = el('table', 'qa-table');
      var thead = el('thead');
      var hr = el('tr');
      [['Game'], ['Objective', 'qa-wide'], ['Best', 'qa-num'], ['Held by', 'qa-wide'], ['']].forEach(function (h) {
        hr.appendChild(el('th', h[1] || null, h[0]));
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el('tbody');
      ORDER.forEach(function (id) {
        var g = GAMES[id];
        var tr = el('tr', 'qa-row');
        var name = button('qa-link');
        name.appendChild(icon(g.icon));
        name.appendChild(document.createTextNode(g.title));
        var play = function () { that.showGame(id); that.root.focus({ preventScroll: true }); };
        name.addEventListener('click', function (e) { e.stopPropagation(); play(); });
        tr.addEventListener('click', play);
        var tdName = el('td');
        tdName.appendChild(name);
        tr.appendChild(tdName);
        tr.appendChild(el('td', 'qa-wide qa-muted', g.objective));
        var best = el('td', 'qa-num');
        var by = el('td', 'qa-wide qa-clip');
        tr.appendChild(best);
        tr.appendChild(by);
        that.scoreCells.push({ key: g.boards[0], best: best, by: by });
        var scores = button('qa-btn', 'Scores');
        scores.addEventListener('click', function (e) { e.stopPropagation(); that.openPanel(id, g.boards[0]); });
        var tdScores = el('td', 'qa-num');
        tdScores.appendChild(scores);
        tr.appendChild(tdScores);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      scroll.appendChild(table);
      body.appendChild(scroll);

      this.statusEl = null;
      this.note = el('div', 'qa-note');
      this.frame.appendChild(head);
      this.frame.appendChild(body);
      this.frame.appendChild(this.note);
      this.updateRestore();
      this.refreshScores();
    }

    showGame(id) {
      var that = this;
      var g = GAMES[id];
      this.clearFrame();
      var head = el('div', 'qa-head');
      if (!this.fixedGame) {
        var back = button('qa-btn qa-icon-btn', null, 'All games');
        back.appendChild(icon('back'));
        back.addEventListener('click', function () { that.showMenu(); that.root.focus({ preventScroll: true }); });
        head.appendChild(back);
      }
      var title = el('div', 'qa-title');
      title.appendChild(icon(g.icon));
      title.appendChild(document.createTextNode(g.title));
      head.appendChild(title);
      var pill = el('span', 'qa-pill');
      head.appendChild(pill);
      var score = this.stat(head, BOARDS[g.boards[0]].time ? 'Time' : 'Score');
      var extra = this.stat(head, '');
      extra.wrap.style.display = 'none';
      var best = this.stat(head, 'Best');
      head.appendChild(el('div', 'qa-spacer'));
      var controls = el('div', 'qa-stat');
      head.appendChild(controls);
      var scoresBtn = button('qa-btn', 'Scores');
      scoresBtn.addEventListener('click', function () { that.openPanel(id, that.boardKey); });
      head.appendChild(scoresBtn);
      var restart = button('qa-btn', 'New game');
      restart.addEventListener('click', function () {
        if (that.game) { that.game.restart(); }
        that.root.focus({ preventScroll: true });
      });
      head.appendChild(restart);
      head.appendChild(this.minimizeButton());

      var body = el('div', 'qa-body');
      this.body = body;
      var wrap = el('div', 'qa-board-wrap');
      body.appendChild(wrap);
      var status = el('div', 'qa-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      this.statusEl = status;
      this.note = el('div', 'qa-note');
      this.frame.appendChild(head);
      this.frame.appendChild(body);
      this.frame.appendChild(status);
      this.frame.appendChild(this.note);

      this.bestStat = best;
      this.gameId = id;
      this.boardKey = g.boards[0];
      this.updateRestore();

      function setState(state) {
        var s = STATES[state] || STATES.ready;
        pill.textContent = s.label;
        var colors = s.status ? STATUS[s.status] : null;
        pill.style.background = colors ? colors.bg : '';
        pill.style.borderColor = colors ? colors.bg : '';
        pill.style.color = colors ? colors.fg : '';
        pill.setAttribute('data-status', s.status || 'ok');
      }
      setState('ready');

      var api = {
        wrap: wrap,
        controls: controls,
        el: el,
        rgba: rgba,
        formatTime: formatTime,
        colors: function () { return that.colors; },
        setState: setState,
        setScore: function (text) { score.value.textContent = text; },
        setExtra: function (label, text) {
          extra.wrap.style.display = label ? '' : 'none';
          extra.label.textContent = label;
          extra.value.textContent = text;
        },
        setStatus: function (text, strong) {
          status.textContent = text || '';
          if (strong) { status.setAttribute('data-tone', 'strong'); } else { status.removeAttribute('data-tone'); }
        },
        setBoard: function (key) { that.boardKey = key; that.refreshScores(); },
        isFocused: function () { return that.root.contains(document.activeElement); },
        isSuspended: function () { return !!that.suspended; },
        /** A run clock; held automatically while the widget is collapsed or showing scores. */
        clock: function (onTick) {
          var c = makeClock(onTick);
          that.clocks.push(c);
          if (that.suspended) { c.hold(true); }
          return c;
        },
        /** Calls fn(width, height) of the board area now and on every resize; returns a disconnect function. */
        observeSize: function (fn) {
          var last = '';
          function check() {
            var w = Math.floor(wrap.clientWidth);
            var h = Math.floor(wrap.clientHeight);
            if (w + 'x' + h !== last && w > 0 && h > 0) { last = w + 'x' + h; fn(w, h); }
          }
          var ro = window.ResizeObserver ? new window.ResizeObserver(check) : null;
          if (ro) { ro.observe(wrap); } else { window.addEventListener('resize', check); }
          check();
          return function () { if (ro) { ro.disconnect(); } else { window.removeEventListener('resize', check); } };
        },
        /** Calls fn('up'|'down'|'left'|'right') for a swipe or drag on target. */
        onSwipe: function (target, fn) {
          var start = null;
          target.addEventListener('pointerdown', function (e) { start = { x: e.clientX, y: e.clientY }; });
          target.addEventListener('pointerup', function (e) {
            if (!start) { return; }
            var dx = e.clientX - start.x;
            var dy = e.clientY - start.y;
            start = null;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { return; }
            fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          });
          target.addEventListener('pointercancel', function () { start = null; });
        },
        /** Arrow keys and WASD to a direction, or null. */
        keyDirection: function (e) {
          return { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
            W: 'up', S: 'down', A: 'left', D: 'right' }[e.key] || null;
        },
        /** Report a finished run to the current board; adds the placing to the status line. */
        finish: function (value) {
          var key = that.boardKey;
          var game = that.game;
          var before = status.textContent;
          return that.store.submit(key, value).then(function (rank) {
            if (that.game !== game) { return rank; }
            that.lastRank = rank ? { key: key, rank: rank } : null;
            that.refreshScores();
            if (rank && status.textContent === before) {
              api.setStatus(before + ' ' + (rank === 1 ? 'New best on the scoreboard!' : 'Placed #' + rank + ' on the scoreboard.'), true);
            }
            return rank;
          }, function (err) {
            that.loadNote = 'Could not save the score to the station (' + (err && err.message ? err.message : err) + ').';
            that.refreshScores();
            return 0;
          });
        }
      };
      this.game = g.module.create(api);
      this.refreshScores();
    }

    stat(parent, label) {
      var wrap = el('div', 'qa-stat');
      var l = el('span', 'qa-stat-label', label);
      var v = el('span', 'qa-stat-value', '0');
      wrap.appendChild(l);
      wrap.appendChild(v);
      parent.appendChild(wrap);
      return { wrap: wrap, label: l, value: v };
    }

    // ---- Scoreboard panel ----

    openPanel(gameId, key) {
      var that = this;
      var g = GAMES[gameId];
      this.closePanel(true);
      var panel = el('div', 'qa-panel');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', g.title + ' scoreboard');
      var head = el('div', 'qa-panel-head');
      var title = el('div', 'qa-panel-title');
      title.appendChild(document.createTextNode(g.title + ' scoreboard'));
      head.appendChild(title);
      var select = null;
      if (g.boards.length > 1) {
        select = el('select', 'qa-select');
        select.setAttribute('aria-label', 'Board');
        g.boards.forEach(function (k) {
          var o = el('option', null, BOARDS[k].label);
          o.value = k;
          select.appendChild(o);
        });
        select.value = key;
        select.addEventListener('change', function () { that.panelKey = select.value; that.renderPanel(); });
        head.appendChild(select);
      }
      head.appendChild(el('div', 'qa-spacer'));
      var close = button('qa-btn', 'Close');
      close.addEventListener('click', function () { that.closePanel(); });
      head.appendChild(close);
      this.panelScroll = el('div', 'qa-scroll');
      panel.appendChild(head);
      panel.appendChild(this.panelScroll);
      this.panel = panel;
      this.panelKey = key;
      this.body.appendChild(panel);
      this.renderPanel();
      this.updateSuspend();
      close.focus({ preventScroll: true });
    }

    closePanel(silent) {
      if (!this.panel) { return; }
      this.panel.remove();
      this.panel = null;
      this.updateSuspend();
      if (!silent) { this.root.focus({ preventScroll: true }); }
    }

    renderPanel() {
      if (!this.panel) { return; }
      var key = this.panelKey;
      var rows = this.store.rows(key);
      var mine = this.lastRank && this.lastRank.key === key ? this.lastRank.rank : 0;
      this.panelScroll.innerHTML = '';
      if (!rows.length) {
        this.panelScroll.appendChild(el('div', 'qa-empty', 'No runs yet.'));
        return;
      }
      var table = el('table', 'qa-table');
      var hr = el('tr');
      [['#', 'qa-num'], [BOARDS[key].time ? 'Time' : 'Score', 'qa-num'], ['Operator'], ['Date', 'qa-wide']].forEach(function (h) {
        hr.appendChild(el('th', h[1] || null, h[0]));
      });
      var thead = el('thead');
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el('tbody');
      rows.forEach(function (r, i) {
        var tr = el('tr', i + 1 === mine ? 'qa-row-mine' : null);
        tr.appendChild(el('td', 'qa-num qa-muted', String(i + 1)));
        tr.appendChild(el('td', 'qa-num', formatValue(key, r.value) + (BOARDS[key].unit ? ' ' + BOARDS[key].unit : '')));
        tr.appendChild(el('td', 'qa-clip', r.user));
        tr.appendChild(el('td', 'qa-wide qa-muted', r.date));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      this.panelScroll.appendChild(table);
    }

    refreshScores() {
      var that = this;
      if (!this.root || this.destroyed) { return; }
      (this.scoreCells || []).forEach(function (s) {
        var best = that.store.best(s.key);
        s.best.textContent = best ? formatValue(s.key, best.value) : '—';
        s.by.textContent = best ? best.user : '';
        s.by.title = s.by.textContent;
      });
      if (this.gameId && this.bestStat) {
        var top = this.store.best(this.boardKey);
        this.bestStat.value.textContent = top ? formatValue(this.boardKey, top.value) + ' · ' + top.user : '—';
      }
      this.renderPanel();
      if (this.note) {
        this.note.textContent = this.loadNote || (this.store.isShared() ? '' : 'Scores are saved in this browser. Set lookBusyOrd to a LookBusy component to share them.');
      }
    }
  }

  return {
    GameWidget: GameWidget,
    parseColor: parseColor,
    rgba: rgba,
    formatTime: formatTime,
    el: el
  };
});
