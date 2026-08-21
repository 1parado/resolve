/* ==========================================================================
   pages/auth.js — 登录 / 注册（GitHub OAuth mock + 邮箱注册登录）
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.auth = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I;

  var root = document.createElement('div');
  root.className = 'auth-wrap';
  root.innerHTML =
    '<div class="auth-card">' +
      '<div class="auth-brand">' +
        '<div class="logo">' +
          '<span class="logo-mark"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5zm0 2.2L18.5 9 12 13.8 5.5 9 12 4.2z" fill="#fff"/><circle cx="19" cy="19" r="3" fill="#fff" opacity=".9"/></svg></span>' +
          '<span class="logo-text">Re<em>solve</em></span>' +
        '</div>' +
        '<div class="auth-slogan">让每一个终端<br>成为可调用的 AI 节点<small>接入本地 Agent 与模型，按 token 按次付费，企业内网数据不出局域网。</small></div>' +
        '<ul class="auth-points">' +
          '<li><span class="ap-ico">' + I('plug', 15) + '</span>本地扫盘 · 一键接入 · 可视化上架</li>' +
          '<li><span class="ap-ico">' + I('coins', 15) + '</span>按 token 计费，拒绝月订阅</li>' +
          '<li><span class="ap-ico">' + I('building', 15) + '</span>企业版内网互相查看与调用</li>' +
        '</ul>' +
      '</div>' +
      '<div class="auth-main">' +
        '<div class="auth-title">欢迎回来</div>' +
        '<div class="auth-sub">登录 Resolve 控制台，管理你的 Agent 与节点</div>' +
        '<button type="button" class="btn btn-github btn-github-login block"></button>' +
        '<div class="auth-divider">或使用邮箱</div>' +
        '<form class="auth-form" id="authForm" novalidate></form>' +
        '<div class="auth-extra"><span id="authHint">还没有账号？<a href="javascript:void(0)" id="toggleMode">立即注册</a></span></div>' +
        '<div class="auth-foot">登录即表示同意 <a href="javascript:void(0)">服务条款</a> 与 <a href="javascript:void(0)">隐私政策</a></div>' +
      '</div>' +
    '</div>';

  var state = { mode: 'login', sending: false };
  var formEl = root.querySelector('#authForm');
  var hintEl = root.querySelector('#authHint');
  formEl.addEventListener('submit', function (e) { e.preventDefault(); submitEmail(); });

  function gitBtn() {
    var b = root.querySelector('.btn-github-login');
    b.innerHTML = window.ResolveIcons.brand('github', { size: 18 }) + '<span>使用 GitHub 登录</span>';
  }
  gitBtn();

  /* ---------- GitHub OAuth（mock 授权弹窗） ---------- */
  function githubFlow() {
    var body = document.createElement('div');
    body.className = 'github-oauth';
    body.innerHTML =
      '<div class="oauth-browser">' +
        '<span class="ob-dot"></span><span class="ob-dot"></span><span class="ob-dot"></span>' +
        '<span class="ob-url">github.com/login/oauth/authorize</span>' +
      '</div>' +
      '<div class="oauth-user">' + buildUserRow() + '</div>' +
      '<div class="oauth-desc">正在请求授权访问以下信息：</div>' +
      '<div class="oauth-perms">' +
        '<div class="op-row">' + I('user', 15) + '<span>读取公开资料与头像</span></div>' +
        '<div class="op-row">' + I('check-circle', 15) + '<span>访问你的邮箱地址（用于账单通知）</span></div>' +
        '<div class="op-row">' + I('shield', 15) + '<span>创建 Resolve 会话令牌</span></div>' +
      '</div>';
    var m = UI.modal({
      title: 'GitHub 授权',
      subtitle: '以 GitHub 账号身份登录 Resolve',
      body: body, lg: true,
      footer: [UI.btn({ label: '取消', onClick: function () { m.close(); } }),
               UI.btn({ label: '授权并登录', variant: 'primary', onClick: function (ev, btn) {
                 btn.disabled = true; btn.textContent = '正在跳转…';
                 setTimeout(function () {
                   m.close();
                   D.login('github', { name: '陈默', github: 'chenmo-dev', email: 'chenmo.dev@gmail.com', color: '#1a73e8' });
                   UI.toast({ type: 'success', title: '已通过 GitHub 登录', desc: '欢迎回来，chenmo-dev' });
                   bootAuthed();
                 }, 900);
               } })]
    });
    function buildUserRow() {
      var av = UI.avatar({ name: 'chenmo-dev', src: D.identicon('chenmo-dev', 56), size: 56, color: '#1a73e8' });
      var wrap = document.createElement('div');
      wrap.className = 'oauth-user-row';
      wrap.appendChild(av);
      wrap.insertAdjacentHTML('beforeend', '<div class="ou-info"><div class="ou-name">chenmo-dev</div><div class="ou-meta">github.com/chenmo-dev</div></div>' +
        '<span class="ou-badge">' + window.ResolveIcons.brand('github', { size: 15 }) + 'GitHub 账号</span>');
      return wrap.innerHTML;
    }
  }

  /* ---------- 表单 ---------- */
  function renderForm() {
    formEl.innerHTML = '';
    var isLogin = state.mode === 'login';
    if (isLogin) {
      formEl.appendChild(field('邮箱', 'email', 'name@example.com', 'email', true));
      formEl.appendChild(field('密码', 'password', '••••••••', 'password', true));
      var submit = UI.btn({ label: '登录', variant: 'primary', size: 'lg', block: true, onClick: submitEmail });
      formEl.appendChild(submit);
    } else {
      formEl.appendChild(field('昵称', 'name', '你的昵称', 'text', true));
      formEl.appendChild(field('邮箱', 'email', 'name@example.com', 'email', true));
      var row = document.createElement('div');
      row.className = 'auth-code-row';
      var codeField = field('验证码', 'code', '6 位验证码', 'text', true);
      codeField.querySelector('.inp').style.flex = '1';
      var codeBtn = UI.btn({ label: '获取验证码', variant: 'secondary', onClick: sendCode });
      row.appendChild(codeField);
      row.appendChild(wrapBtn(codeBtn));
      formEl.appendChild(row);
      formEl.appendChild(field('密码', 'password', '至少 6 位', 'password', true));
      formEl.appendChild(UI.btn({ label: '注册并登录', variant: 'primary', size: 'lg', block: true, onClick: submitEmail }));
    }
  }
  function wrapBtn(btn) { var w = document.createElement('div'); w.style.flex = '0 0 auto'; w.style.alignSelf = 'flex-end'; w.appendChild(btn); return w; }
  function field(label, key, ph, type) {
    var f = UI.field({
      label: label, placeholder: ph, type: type, id: 'af-' + key,
      autocomplete: key === 'password' ? (state.mode === 'login' ? 'current-password' : 'new-password') : 'on'
    });
    f.dataset.key = key;
    return f;
  }
  function readForm() {
    var obj = {};
    formEl.querySelectorAll('.field').forEach(function (f) { obj[f.dataset.key] = f.input.value.trim(); });
    return obj;
  }
  function sendCode() {
    var v = readForm().email;
    if (!/.+@.+\..+/.test(v || '')) { UI.toast({ type: 'error', title: '请先输入正确的邮箱' }); return; }
    UI.toast({ type: 'success', title: '验证码已发送', desc: '模拟验证码：123456' });
  }
  function submitEmail() {
    if (state.sending) return;
    var v = readForm();
    if (state.mode === 'login') {
      if (!/.+@.+\..+/.test(v.email || '')) return UI.toast({ type: 'error', title: '请输入有效的邮箱地址' });
      if (!v.password || v.password.length < 4) return UI.toast({ type: 'error', title: '密码至少 4 位' });
      state.sending = true;
      var local = v.email.split('@')[0];
      D.login('email', { name: local.charAt(0).toUpperCase() + local.slice(1), email: v.email, github: '', color: D.colorOf(local) });
      UI.toast({ type: 'success', title: '登录成功', desc: '欢迎回来，' + local });
      bootAuthed();
    } else {
      if (!v.name) return UI.toast({ type: 'error', title: '请填写昵称' });
      if (!/.+@.+\..+/.test(v.email || '')) return UI.toast({ type: 'error', title: '请输入有效的邮箱地址' });
      if (!v.code || v.code.length < 4) return UI.toast({ type: 'error', title: '请输入 6 位验证码（模拟 123456）' });
      if (!v.password || v.password.length < 6) return UI.toast({ type: 'error', title: '密码至少 6 位' });
      state.sending = true;
      D.login('email', { name: v.name, email: v.email, github: '', color: D.colorOf(v.name) });
      UI.toast({ type: 'success', title: '注册成功', desc: '已为你自动登录' });
      bootAuthed();
    }
  }

  /* ---------- 模式切换 ---------- */
  function toggleMode() {
    state.mode = state.mode === 'login' ? 'register' : 'login';
    root.querySelector('.auth-title').textContent = state.mode === 'login' ? '欢迎回来' : '创建账号';
    root.querySelector('.auth-sub').textContent = state.mode === 'login' ? '登录 Resolve 控制台，管理你的 Agent 与节点' : '注册后即可接入并上架你的 Agent';
    hintEl.innerHTML = state.mode === 'login'
      ? '还没有账号？<a href="javascript:void(0)" id="toggleMode">立即注册</a>'
      : '已有账号？<a href="javascript:void(0)" id="toggleMode">直接登录</a>';
    hintEl.querySelector('#toggleMode').addEventListener('click', toggleMode);
    renderForm();
  }
  root.querySelector('#toggleMode').addEventListener('click', toggleMode);
  root.querySelector('.btn-github-login').addEventListener('click', githubFlow);
  renderForm();

  function bootAuthed() {
    if (window.ResolveApp && window.ResolveApp.applyAuthUI) window.ResolveApp.applyAuthUI();
    R.nav('/');
  }

  return root;
};
