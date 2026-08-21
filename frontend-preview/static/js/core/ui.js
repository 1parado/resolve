/* ==========================================================================
   ui.js — 设计系统基础组件（全部由 theme.css tokens 驱动）
   Button / Tag / Avatar / SegmentedControl / Switch / Tabs / Modal / Toast /
   Input/Field / Progress / Stepper / Stat / Empty / Rating / Dropdown / OS 徽标
   ========================================================================== */
window.ResolveUI = (function () {
  'use strict';
  var D = window.ResolveData;
  var I = window.ResolveIcons.icon;

  function esc(s) { return D.esc(s); }
  function h(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  /* ---------------- Button ---------------- */
  function btn(opts) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'btn ' + (opts.variant || 'secondary') + (opts.size ? ' ' + opts.size : '') + (opts.block ? ' block' : '');
    if (opts.icon) el.insertAdjacentHTML('afterbegin', I(opts.icon, opts.iconSize || 16));
    if (opts.label !== undefined) el.appendChild(document.createTextNode(opts.label));
    if (opts.title) el.title = opts.title;
    if (opts['aria-label']) el.setAttribute('aria-label', opts['aria-label']);
    el.disabled = !!opts.disabled;
    if (opts.onClick) el.addEventListener('click', function (ev) { opts.onClick(ev, el); });
    return el;
  }
  function iconBtn(name, opts) {
    opts = opts || {};
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'icon-btn' + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('aria-label', opts.label || name);
    el.innerHTML = I(name, opts.size || 18);
    if (opts.badge) el.insertAdjacentHTML('beforeend', '<span class="dot-badge"></span>');
    if (opts.onClick) el.addEventListener('click', function (ev) { opts.onClick(ev, el); });
    return el;
  }

  /* ---------------- Tag ---------------- */
  function tag(opts) {
    var el = document.createElement('span');
    el.className = 'tag ' + (opts.variant || 'default');
    if (opts.dot) {
      el.classList.add('has-dot');
      el.insertAdjacentHTML('afterbegin', '<span class="t-dot" style="background:' + (typeof opts.dot === 'string' ? opts.dot : 'var(--ok)') + '"></span>');
    }
    if (opts.icon) el.insertAdjacentHTML('afterbegin', I(opts.icon, 13));
    if (opts.text !== undefined) el.appendChild(document.createTextNode(opts.text));
    return el;
  }

  /* ---------------- Avatar（头像 / identicon / 状态点） ---------------- */
  function avatar(opts) {
    var el = document.createElement('span');
    el.className = 'avatar' + (opts.square ? ' sq' : '');
    el.style.width = el.style.height = (opts.size || 36) + 'px';
    el.style.fontSize = Math.round((opts.size || 36) * 0.38) + 'px';
    if (opts.src) {
      el.style.backgroundImage = 'url("' + opts.src + '")';
    } else {
      el.style.background = opts.color || D.colorOf(opts.name || '?');
      el.textContent = D.initialsOf(opts.name || '?');
    }
    if (opts.status) {
      var dot = document.createElement('span');
      dot.className = 'av-dot ' + opts.status;
      el.appendChild(dot);
    }
    return el;
  }

  /* ---------------- SegmentedControl（iOS 风格） ---------------- */
  function segmented(opts) {
    var el = document.createElement('div');
    el.className = 'seg';
    (opts.options || []).forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-item' + (o.value === opts.value ? ' active' : '');
      if (o.icon) b.insertAdjacentHTML('afterbegin', I(o.icon, 15));
      b.appendChild(document.createTextNode(o.label));
      b.addEventListener('click', function () {
        if (o.value === opts.value) return;
        if (opts.onChange) opts.onChange(o.value);
      });
      el.appendChild(b);
    });
    return el;
  }

  /* ---------------- Switch（iOS 拨杆） ---------------- */
  function sw(opts) {
    var l = document.createElement('label');
    l.className = 'switch' + (opts.checked ? ' on' : '') + (opts.disabled ? ' dis' : '');
    var inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.checked = !!opts.checked;
    inp.disabled = !!opts.disabled;
    var knob = document.createElement('span');
    knob.className = 'knob';
    l.appendChild(inp); l.appendChild(knob);
    inp.addEventListener('change', function () {
      l.classList.toggle('on', inp.checked);
      if (opts.onChange) opts.onChange(inp.checked);
    });
    return l;
  }

  /* ---------------- Input / Field ---------------- */
  function input(opts) {
    var el = document.createElement('input');
    el.type = opts.type || 'text';
    el.className = 'inp';
    if (opts.placeholder) el.placeholder = opts.placeholder;
    if (opts.value) el.value = opts.value;
    if (opts.id) el.id = opts.id;
    if (opts.autocomplete) el.setAttribute('autocomplete', opts.autocomplete);
    if (opts.inputmode) el.setAttribute('inputmode', opts.inputmode);
    if (opts.pattern) el.pattern = opts.pattern;
    el.addEventListener('input', function () { if (opts.onInput) opts.onInput(el.value); });
    return el;
  }
  function field(opts) {
    var el = document.createElement('div');
    el.className = 'field' + (opts.error ? ' has-error' : '');
    var html = (opts.label ? '<label class="fl">' + esc(opts.label) + '</label>' : '') +
      '<div class="fi"></div>' +
      (opts.hint ? '<div class="fh">' + esc(opts.hint) + '</div>' : '') +
      (opts.error ? '<div class="fe">' + esc(opts.error) + '</div>' : '');
    el.innerHTML = html;
    var box = el.querySelector('.fi');
    if (opts.prefix) box.insertAdjacentHTML('afterbegin', I(opts.prefix, 16));
    var inp = input(opts);
    box.appendChild(inp);
    el.input = inp;
    el.setError = function (msg) {
      el.classList.toggle('has-error', !!msg);
      var fe = el.querySelector('.fe');
      if (msg) { if (!fe) { var d = document.createElement('div'); d.className = 'fe'; el.appendChild(d); fe = d; } fe.textContent = msg; }
      else if (fe) fe.remove();
    };
    return el;
  }

  /* ---------------- Tabs ---------------- */
  function tabs(opts) {
    var el = document.createElement('div');
    el.className = 'tabs' + (opts.variant ? ' ' + opts.variant : '');
    (opts.items || []).forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (it.value === opts.value ? ' active' : '');
      b.textContent = it.label;
      b.addEventListener('click', function () {
        if (it.value !== opts.value && opts.onChange) opts.onChange(it.value);
      });
      el.appendChild(b);
    });
    return el;
  }

  /* ---------------- Progress ---------------- */
  function progress(opts) {
    var el = document.createElement('div');
    el.className = 'progress';
    var fill = document.createElement('div');
    fill.className = 'p-fill';
    fill.style.width = Math.max(0, Math.min(100, opts.value || 0)) + '%';
    if (opts.color) fill.style.background = opts.color;
    el.appendChild(fill);
    return el;
  }

  /* ---------------- Stepper ---------------- */
  function stepper(opts) {
    var el = document.createElement('div');
    el.className = 'stepper';
    (opts.steps || []).forEach(function (s, i) {
      var st = document.createElement('div');
      st.className = 'step' + (i < opts.current ? ' done' : '') + (i === opts.current ? ' current' : '');
      st.innerHTML = '<span class="step-num">' + (i < opts.current ? I('check', 13) : (i + 1)) + '</span>' +
        '<span class="step-lbl">' + esc(s) + '</span>';
      el.appendChild(st);
    });
    return el;
  }

  /* ---------------- Stat ---------------- */
  function stat(opts) {
    var el = document.createElement('div');
    el.className = 'stat' + (opts.accent ? ' accent' : '');
    el.innerHTML = '<div class="stat-ico">' + I(opts.icon, 18) + '</div>' +
      '<div class="stat-body"><div class="stat-val">' + opts.value + '</div><div class="stat-lbl">' + esc(opts.label) + '</div></div>' +
      (opts.hint ? '<div class="stat-hint">' + esc(opts.hint) + '</div>' : '');
    return el;
  }

  /* ---------------- Empty ---------------- */
  function empty(opts) {
    var el = document.createElement('div');
    el.className = 'empty';
    el.innerHTML = '<div class="empty-ico">' + I(opts.icon || 'info', 26) + '</div>' +
      '<div class="empty-title">' + esc(opts.title) + '</div>' +
      (opts.desc ? '<div class="empty-desc">' + esc(opts.desc) + '</div>' : '');
    if (opts.action) el.appendChild(opts.action);
    return el;
  }

  /* ---------------- Rating ---------------- */
  function rating(opts) {
    var el = document.createElement('span');
    el.className = 'rating';
    var html = '', i;
    for (i = 1; i <= 5; i++) html += I('star', 13, i <= Math.round(opts.value) ? 'on' : '');
    el.innerHTML = html + '<span class="r-val">' + (opts.value || 0).toFixed(1) + '</span>';
    return el;
  }

  /* ---------------- OS 徽标 ---------------- */
  var OS_ICON = { macos: 'apple', windows: 'windows', linux: 'linux' };
  function osBadge(os) {
    var el = document.createElement('span');
    el.className = 'os-badge ' + (os.id || '');
    el.innerHTML = window.ResolveIcons.brand(OS_ICON[os.id] || 'cpu', { size: 14 }) + '<span>' + esc(os.label) + '</span>';
    return el;
  }

  /* ---------------- Modal ---------------- */
  function modal(opts) {
    var root = document.getElementById('modal-root');
    var el = document.createElement('div');
    el.className = 'modal-mask' + (opts.sheet ? ' sheet' : '');
    el.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true"' + (opts.title ? ' aria-label="' + esc(opts.title) + '"' : '') + '>' +
        (opts.title ? '<div class="modal-head"><div class="modal-titles"><div class="modal-title">' + esc(opts.title) + '</div>' +
          (opts.subtitle ? '<div class="modal-sub">' + esc(opts.subtitle) + '</div>' : '') + '</div>' +
          '<button type="button" class="icon-btn modal-close" aria-label="关闭">' + I('x', 18) + '</button></div>' : '') +
        '<div class="modal-body"></div>' +
        (opts.footer ? '<div class="modal-foot"></div>' : '') +
      '</div>';
    root.appendChild(el);
    var body = el.querySelector('.modal-body');
    var foot = el.querySelector('.modal-foot');
    if (opts.body !== undefined && opts.body !== null) {
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else body.appendChild(opts.body);
    }
    if (opts.footer) {
      if (typeof opts.footer === 'string') foot.innerHTML = opts.footer;
      else if (Array.isArray(opts.footer)) opts.footer.forEach(function (n) { foot.appendChild(n); });
      else foot.appendChild(opts.footer);
    }
    var closed = false;
    function close() {
      if (closed) return; closed = true;
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 260);
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    }
    function open() {
      el.classList.add('show');
      var f = el.querySelector('input, select, textarea, [tabindex]');
      if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 80);
      if (opts.onOpen) opts.onOpen();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    el.addEventListener('click', function (ev) {
      if (ev.target === el) close();
    });
    el.querySelector('.modal-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    el.setBody = function (content) {
      body.innerHTML = '';
      if (typeof content === 'string') body.innerHTML = content;
      else body.appendChild(content);
      return body;
    };
    el.close = close;
    el.open = open;
    open();
    return el;
  }

  /* ---------------- Toast ---------------- */
  var TOAST_ICON = { success: 'check-circle', error: 'alert', info: 'info', warn: 'alert' };
  function toast(opts) {
    var wrap = document.getElementById('toast-root');
    var el = document.createElement('div');
    var type = opts.type || 'info';
    el.className = 'toast toast-' + type;
    el.innerHTML = '<span class="toast-ico">' + I(TOAST_ICON[type] || 'info', 18) + '</span>' +
      '<div class="toast-body"><div class="toast-title">' + esc(opts.title) + '</div>' +
      (opts.desc ? '<div class="toast-desc">' + esc(opts.desc) + '</div>' : '') + '</div>' +
      (opts.action ? '<button type="button" class="toast-act">' + esc(opts.action.label) + '</button>' : '');
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });
    var timer = setTimeout(function () { dismiss(); }, opts.duration || 3400);
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 320);
    }
    if (opts.action) el.querySelector('.toast-act').addEventListener('click', function () {
      opts.action.onClick();
      dismiss();
    });
    return { el: el, dismiss: dismiss };
  }

  /* ---------------- Dropdown（头像菜单等） ---------------- */
  function dropdown(opts) {
    var el = document.createElement('div');
    el.className = 'dropdown';
    var trig = document.createElement('button');
    trig.type = 'button';
    trig.className = 'dd-trigger';
    trig.setAttribute('aria-haspopup', 'menu');
    trig.appendChild(opts.trigger);
    el.appendChild(trig);
    var menu = document.createElement('div');
    menu.className = 'dd-menu';
    menu.setAttribute('role', 'menu');
    (opts.items || []).forEach(function (it) {
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'dd-item' + (it.danger ? ' danger' : '');
      if (it.icon) a.insertAdjacentHTML('afterbegin', I(it.icon, 15));
      a.appendChild(document.createElement('span')).textContent = it.label;
      a.addEventListener('click', function () {
        close();
        if (it.onClick) it.onClick();
      });
      menu.appendChild(a);
    });
    el.appendChild(menu);
    function close() { el.classList.remove('open'); }
    trig.addEventListener('click', function (ev) { ev.stopPropagation(); el.classList.toggle('open'); });
    document.addEventListener('click', function (ev) { if (!el.contains(ev.target)) close(); });
    return el;
  }

  /* ---------------- 状态点 ---------------- */
  function statusDot(status, label) {
    var el = document.createElement('span');
    el.className = 'status-text ' + status;
    el.innerHTML = '<span class="s-dot"></span><span>' + esc(label) + '</span>';
    return el;
  }

  return {
    h: h, esc: esc, btn: btn, iconBtn: iconBtn, tag: tag, avatar: avatar,
    segmented: segmented, switch: sw, input: input, field: field, tabs: tabs,
    progress: progress, stepper: stepper, stat: stat, empty: empty,
    rating: rating, osBadge: osBadge, modal: modal, toast: toast,
    dropdown: dropdown, statusDot: statusDot, I: I
  };
})();
