/* ==========================================================================
   app.js — 启动：外壳装配（侧边栏 / 顶栏 / Tab 栏）、路由注册、全局状态
   ========================================================================== */
(function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I, T = window.ResolveI18N.T, L = window.ResolveI18N;

  var shell = document.getElementById('app');
  var fullpage = document.getElementById('fullpage');
  var view = document.getElementById('view');
  var sideBalance = document.getElementById('sideBalance');
  var topBalance = document.getElementById('topBalance');
  var topTitle = document.getElementById('topTitle');
  var sideUser = document.getElementById('sideUser');
  var topAvatar = document.getElementById('topAvatar');
  var COLLAPSE_KEY = 'resolve.sb.collapsed';

  var TITLES = {
    profile: '个人主页', marketplace: 'Agent 市场', connect: '接入', wallet: '钱包', enterprise: '企业版'
  };

  /* ---------- 占位图标注入 ---------- */
  function injectIcons() {
    document.getElementById('langBtn').innerHTML = I('globe', 18);
    document.getElementById('langBtn').setAttribute('aria-label', T('语言'));
    document.getElementById('langBtn').setAttribute('title', T('语言'));
    document.getElementById('topMenuBtn').innerHTML = I('list', 18);
    document.getElementById('topMenuBtn').setAttribute('aria-label', T('打开导航菜单'));
    document.getElementById('bellBtn').innerHTML = I('bell', 18) + '<span class="dot-badge"></span>';
    document.getElementById('bellBtn').setAttribute('aria-label', T('通知'));
    document.getElementById('bellBtn').setAttribute('title', T('通知'));
    var chipIco = document.querySelector('.chip-ico');
    if (chipIco) chipIco.innerHTML = I('coins', 15);
    var navMap = { profile: 'user', marketplace: 'market', connect: 'plug', wallet: 'wallet', enterprise: 'building', github: 'github' };
    document.querySelectorAll('.nav-item').forEach(function (a) {
      var t = a.querySelector('.nav-ico');
      if (t && navMap[a.dataset.nav] !== undefined) t.innerHTML = I(navMap[a.dataset.nav], 18);
    });
    document.querySelectorAll('.tab-item').forEach(function (a) {
      var t = a.querySelector('.tab-ico');
      if (t) t.innerHTML = I(navMap[a.dataset.nav] || 'dot', 20);
    });
  }

  /* ---------- 侧边栏收起 / 展开 ---------- */
  function updateCollapseBtn() {
    var collapsed = document.body.classList.contains('sb-collapsed');
    var btn = document.getElementById('sideCollapse');
    if (!btn) return;
    btn.querySelector('.sc-ico').innerHTML = I(collapsed ? 'chev-right' : 'chev-left', 16);
    btn.querySelector('.sc-lbl').textContent = collapsed ? T('展开侧边栏') : T('收起侧边栏');
  }
  function setCollapsed(collapsed) {
    document.body.classList.toggle('sb-collapsed', collapsed);
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    updateCollapseBtn();
  }
  function toggleSidebar() {
    var now = document.body.classList.contains('sb-collapsed');
    setCollapsed(!now);
  }
  function injectSidebarToggle() {
    var foot = document.querySelector('.side-foot');
    if (!foot) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'side-collapse';
    btn.id = 'sideCollapse';
    btn.setAttribute('aria-label', T('收起侧边栏'));
    btn.innerHTML = '<span class="sc-ico"></span><span class="sc-lbl"></span>';
    btn.addEventListener('click', toggleSidebar);
    foot.appendChild(btn);
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }

  /* ---------- 顶栏与侧栏用户区 ---------- */
  function renderUser() {
    var me = D.me();
    if (!me) { sideUser.innerHTML = ''; topAvatar.innerHTML = ''; return; }
    var ident = D.identicon(me.github || me.name, 120);
    var prov = me.provider === 'github' ? T('GitHub 登录') : T('邮箱登录');

    sideUser.innerHTML = '';
    sideUser.appendChild(UI.avatar({ name: me.github || me.name, src: ident, size: 34, color: me.color }));
    var info = document.createElement('div');
    info.style.cssText = 'min-width:0;';
    info.innerHTML = '<div class="su-name">' + D.esc(me.name) + '</div><div class="su-meta">' + prov + '</div>';
    sideUser.appendChild(info);
    var exit = UI.iconBtn('logout', { label: T('退出登录'), onClick: logout });
    exit.classList.add('su-exit');
    exit.style.cssText = 'margin-left:auto; width:32px; height:32px;';
    sideUser.appendChild(exit);

    topAvatar.innerHTML = '';
    var dd = UI.dropdown({
      trigger: UI.avatar({ name: me.github || me.name, src: ident, size: 34, color: me.color }),
      items: [
        { label: T('个人主页'), icon: 'user', onClick: function () { R.nav('/'); } },
        { label: T('我的钱包'), icon: 'wallet', onClick: function () { R.nav('/wallet'); } },
        { label: T('企业版'), icon: 'building', onClick: function () { R.nav('/enterprise'); } },
        { label: T('退出登录'), icon: 'logout', danger: true, onClick: logout }
      ]
    });
    topAvatar.appendChild(dd);
    dd.querySelector('.dd-menu').style.right = '0';
  }

  function logout() {
    D.logout();
    UI.toast({ type: 'info', title: T('已退出登录') });
    applyAuthUI();
  }

  function refreshBalances() {
    var bal = D.money(D.get().wallet.balance);
    if (sideBalance) sideBalance.textContent = bal;
    if (topBalance) topBalance.textContent = bal;
    renderUser();
  }

  function setActiveNav(name) {
    document.querySelectorAll('.nav-item, .tab-item').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === name);
    });
  }

  /* ---------- 视图挂载 ---------- */
  function mountAuth() {
    shell.hidden = true;
    fullpage.hidden = false;
    fullpage.innerHTML = '';
    fullpage.appendChild(window.ResolvePages.auth());
  }
  function mountMain(name) {
    shell.hidden = false;
    fullpage.hidden = true;
    view.innerHTML = '';
    view.appendChild(window.ResolvePages[name]());
    setActiveNav(name);
    topTitle.textContent = T(TITLES[name] || 'Resolve');
    refreshBalances();
    view.focus();
  }
  function applyAuthUI() {
    if (D.isAuthed()) refreshBalances();
    R.run();
  }

  /* ---------- 路由 ---------- */
  R.setGuard(function (path) {
    var authed = D.isAuthed();
    if (path !== '/login' && !authed) { R.nav('/login'); return false; }
    if (path === '/login' && authed) { R.nav('/'); return false; }
    return true;
  });
  R.register('/login', { title: '登录', render: function () { mountAuth(); } });
  R.register('/', { title: '个人主页', render: function () { mountMain('profile'); } });
  R.register('/marketplace', { title: 'Agent 市场', render: function () { mountMain('marketplace'); } });
  R.register('/connect', { title: '接入', render: function () { mountMain('connect'); } });
  R.register('/wallet', { title: '钱包', render: function () { mountMain('wallet'); } });
  R.register('/enterprise', { title: '企业版', render: function () { mountMain('enterprise'); } });

  /* ---------- 事件 ---------- */
  document.getElementById('langBtn').addEventListener('click', function () { L.toggle(); });
  document.getElementById('bellBtn').addEventListener('click', function () {
    UI.toast({ type: 'info', title: T('暂无新通知'), desc: T('有 Agent 被调用或充值到账时会第一时间通知你') });
  });
  document.getElementById('topMenuBtn').addEventListener('click', toggleSidebar);
  D.on(function () { if (D.isAuthed()) refreshBalances(); });

  /* ---------- 语言切换钩子：重设标题 / 侧栏收起文案 / 用户区 / 当前视图 ---------- */
  function applyLocale() {
    var lb = document.getElementById('langBtn');
    if (lb) { lb.setAttribute('aria-label', T('语言')); lb.setAttribute('title', T('语言')); }
    updateCollapseBtn();
    renderUser();
    R.run();
  }
  L.onChange(function () { applyLocale(); });

  /* ---------- 启动 ---------- */
  D.get();
  injectIcons();
  injectSidebarToggle();
  window.ResolveApp = { applyAuthUI: applyAuthUI, applyLocale: applyLocale };
  R.run();
})();