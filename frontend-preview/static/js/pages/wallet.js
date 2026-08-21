/* ==========================================================================
   pages/wallet.js — 钱包：余额 / 微信 + 支付宝充值（mock 二维码）/ 账单流水
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.wallet = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I, esc = D.esc;

  var data = D.get();
  var root = document.createElement('div');
  root.className = 'page';

  var filter = 'all';
  /* 充值面板状态（需在调用前声明） */
  var amounts = [50, 100, 200, 500, 1000];
  var selAmount = 100;
  var payMethod = 'wechat';
  function payOpts() {
    return [
      { value: 'wechat', label: '微信支付', icon: 'wechat', brand: true },
      { value: 'alipay', label: '支付宝', icon: 'alipay', brand: true }
    ];
  }

  var head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = '<div><h1 class="page-title">钱包</h1>' +
    '<p class="page-sub">余额实时可见，充值支持微信与支付宝；消费按实际 token 与时长结算，多退少补。</p></div>';
  root.appendChild(head);

  var gridWrap = document.createElement('div');
  gridWrap.className = 'wal-grid';
  gridWrap.appendChild(balanceCard());
  gridWrap.appendChild(rechargePanel());
  root.appendChild(gridWrap);

  root.appendChild(billingCard());

  /* ---------- 余额卡 ---------- */
  function balanceCard() {
    var card = document.createElement('div');
    card.className = 'wal-balance-card';
    card.innerHTML =
      '<div class="wal-lbl">' + I('wallet', 15) + '可用余额</div>' +
      '<div class="wal-amt"><small>¥</small>' + D.fmtMoney(data.wallet.balance) + '</div>' +
      '<div class="wal-month">本月已消费 ' + D.money(data.wallet.monthCost) + ' · 服务方收入 ' + D.money(D.stats().revenue) + '</div>';
    var actions = document.createElement('div');
    actions.className = 'wal-actions';
    actions.appendChild(UI.btn({ label: '立即充值', icon: 'plus', onClick: function () { document.querySelector('.wal-recharge-btn').click(); } }));
    actions.appendChild(UI.btn({ label: '提现', icon: 'upload', variant: 'ghost', onClick: withdraw }));
    card.appendChild(actions);
    return card;
  }

  /* ---------- 充值面板 ---------- */
  function rechargePanel() {
    var panel = document.createElement('div');
    panel.className = 'recharge-panel';
    var title = document.createElement('div');
    title.className = 'rp-title';
    title.appendChild(document.createTextNode('充值'));
    title.appendChild(document.createTextNode(' '));
    var chips = document.createElement('div');
    chips.className = 'pay-amt-chips';
    amounts.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pay-chip' + (v === selAmount ? ' active' : '');
      b.textContent = '¥' + v;
      b.addEventListener('click', function () {
        selAmount = v;
        chips.querySelectorAll('.pay-chip').forEach(function (c) { c.classList.remove('active'); });
        b.classList.add('active');
      });
      chips.appendChild(b);
    });
    var payRow = document.createElement('div');
    payRow.style.cssText = 'margin-top:6px;';
    var seg = UI.segmented({
      options: payOpts().map(function (o) {
        return { value: o.value, label: o.label };
      }),
      value: payMethod,
      onChange: function (v) { payMethod = v; }
    });
    payRow.appendChild(seg);
    var btn = UI.btn({ label: '立即充值', icon: 'qr', variant: 'primary', size: 'lg', block: true, cls: 'wal-recharge-btn' });
    btn.classList.add('wal-recharge-btn');
    btn.addEventListener('click', startRecharge);
    panel.appendChild(title);
    panel.appendChild(chips);
    panel.appendChild(payRow);
    panel.appendChild(btn);
    return panel;
  }

  /* ---------- 充值流程 ---------- */
  function startRecharge() {
    var method = payOpts().find(function (o) { return o.value === payMethod; });
    var vendor = method.value === 'wechat' ? '微信支付' : '支付宝';
    var body = document.createElement('div');
    body.innerHTML =
      '<div class="pay-qr-wrap">' +
        '<div class="pay-qr-box">' + qrSVG(payMethod + selAmount + D.me().name) + '</div>' +
        '<div class="pay-qr-side">' +
          '<div class="pay-vendor">' + window.ResolveIcons.brand(method.value, { size: 24 }) + '<span>使用' + vendor + '扫码支付（模拟）</span></div>' +
          '<div class="pay-amount">¥' + D.fmtMoney(selAmount) + '</div>' +
          '<div class="pay-status">请打开' + vendor + '扫一扫完成付款</div>' +
        '</div>' +
      '</div>';
    var m = UI.modal({
      title: '扫码充值', subtitle: '向 Resolve 钱包充值 ¥' + D.fmtMoney(selAmount),
      body: body, sheet: window.innerWidth < 700,
      footer: [
        UI.btn({ label: '取消', onClick: function () { m.close(); } }),
        UI.btn({ label: '我已完成支付', variant: 'primary', onClick: function (ev, btn) {
          btn.disabled = true;
          btn.textContent = '正在确认…';
          setTimeout(function () {
            D.recharge(selAmount, vendor);
            UI.toast({ type: 'success', title: '充值成功', desc: vendor + ' 到账 ' + D.money(selAmount) });
            m.close();
            R.run();
          }, 700);
        } })
      ]
    });
    /* 支持 swap · 防止内部 QR 变形 */
    var box = m.querySelector('.pay-qr-box');
    if (box) box.style.width = '180px';
  }

  /* ---------- 提现 ---------- */
  function withdraw() {
    var f = UI.field({ label: '提现金额', type: 'number', placeholder: '请输入金额', value: '100' });
    var body = document.createElement('div');
    body.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
    body.appendChild(f);
    var note = document.createElement('div');
    note.style.cssText = 'font-size:12px; color:var(--text-faint);';
    note.innerHTML = I('info', 12) + ' 提现到实名银行卡，T+1 到账（模拟）。当前余额 ' + D.money(data.wallet.balance);
    body.appendChild(note);
    var m = UI.modal({ title: '提现', body: body, footer: [
      UI.btn({ label: '取消', onClick: function () { m.close(); } }),
      UI.btn({ label: '确认提现', variant: 'primary', onClick: function (ev, btn) {
        var v = parseFloat(f.input.value);
        if (!v || v <= 0) return UI.toast({ type: 'error', title: '请输入有效金额' });
        if (v > data.wallet.balance) return UI.toast({ type: 'error', title: '余额不足' });
        D.addBilling({ type: 'withdraw', agent: '提现到银行卡', amount: -v, method: '银行卡' });
        D.get().wallet.balance = Math.round((data.wallet.balance - v) * 100) / 100;
        D.set();
        m.close();
        UI.toast({ type: 'success', title: '提现申请已提交', desc: '¥' + D.fmtMoney(v) + ' 预计 T+1 到账' });
        R.run();
      } })
    ]});
  }

  /* ---------- 账单 ---------- */
  function billingCard() {
    var card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'margin-top:16px;';
    var headH = document.createElement('div');
    headH.className = 'card-head';
    headH.innerHTML = '<div><div class="card-title">' + I('list', 15) + '账单流水</div>' +
      '<div class="card-sub">全部收支记录，可追溯、可申诉</div></div>';
    card.appendChild(headH);
    var tabsWrap = document.createElement('div');
    tabsWrap.className = 'admin-tabs-wrap';
    tabsWrap.style.cssText = 'padding: 12px 20px 0;';
    tabsWrap.appendChild(UI.tabs({
      variant: 'pill',
      items: [
        { value: 'all', label: '全部' }, { value: 'recharge', label: '充值' },
        { value: 'call', label: '消费' }, { value: 'withdraw', label: '提现' }
      ],
      value: filter,
      onChange: function (v) { filter = v; renderBills(body); }
    }));
    card.appendChild(tabsWrap);
    var body = document.createElement('div');
    body.className = 'card-body';
    card.appendChild(body);
    renderBills(body);
    return card;
  }

  function renderBills(body) {
    body.innerHTML = '';
    var list = data.billing.filter(function (b) { return filter === 'all' || b.type === filter; });
    if (!list.length) {
      body.appendChild(UI.empty({ icon: 'list', title: '暂无账单', desc: '该分类下还没有记录。' }));
      return;
    }
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; flex-direction:column;';
    list.forEach(function (b) {
      var row = document.createElement('div');
      row.className = 'bill-row';
      var ico = document.createElement('span');
      ico.className = 'bill-ico';
      var ic = b.type === 'recharge' ? 'download' : b.type === 'withdraw' ? 'upload' : 'zap';
      var bg = b.type === 'recharge' ? 'background:var(--ok-soft); color:#059669' : b.type === 'withdraw' ? 'background:var(--surface-soft); color:var(--text-mid)' : 'background:var(--brand-soft); color:var(--brand)';
      ico.style.cssText = bg;
      ico.innerHTML = I(ic, 16);
      var main = document.createElement('div');
      main.className = 'bill-main';
      var nm = document.createElement('div');
      nm.className = 'bill-name';
      nm.textContent = b.agent;
      var time = document.createElement('div');
      time.className = 'bill-time';
      time.textContent = D.fmtDate(b.time, true) + ' · ' + b.method;
      main.appendChild(nm); main.appendChild(time);
      var amt = document.createElement('span');
      amt.className = 'bill-amt' + (b.amount > 0 ? ' pos' : '');
      amt.textContent = (b.amount > 0 ? '+' : '') + D.money(b.amount);
      row.appendChild(ico); row.appendChild(main); row.appendChild(amt);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  /* ---------- 二维码（确定性 mock，非真实支付码） ---------- */
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function qrSVG(seed) {
    var N = 25, rnd = mulberry(hash(seed));
    var cells = [];
    function dark(x, y) {
      var fx = x % 7, fy = y % 7;
      if (x < 7 && y < 7) return finder(fx, fy);
      if (x < 7 && y >= N - 7) return finder(fx, y - (N - 7));
      if (x >= N - 7 && y < 7) return finder(x - (N - 7), fy);
      return rnd() < 0.46;
    }
    function finder(px, py) {
      if (px === 0 || px === 6 || py === 0 || py === 6) return true;
      if (px >= 2 && px <= 4 && py >= 2 && py <= 4) return true;
      return false;
    }
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (dark(x, y)) cells.push('M' + x + ' ' + y + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ' + (N + 2) + ' ' + (N + 2) + '" width="168" height="168">' +
      '<rect x="-1.4" y="-1.4" width="' + (N + 2.8) + '" height="' + (N + 2.8) + '" fill="#fff" rx="4"/>' +
      '<path d="' + cells.join('') + '" fill="#101828"/></svg>';
  }
  function hash(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  return root;
};