/* ==========================================================================
   pages/marketplace.js — Agent 市场：检索 / 分类 / 排序 / 详情 / 发起调用
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.marketplace = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I, esc = D.esc;

  var data = D.get();
  var root = document.createElement('div');
  root.className = 'page';

  var CATS = [
    { v: '', l: '全部' }, { v: 'code', l: '代码生成' }, { v: 'reason', l: '深度推理' },
    { v: 'data', l: '数据分析' }, { v: 'content', l: '内容创作' }, { v: 'design', l: '设计视觉' }, { v: 'ops', l: '本地算力' }
  ];
  var q = '', cat = '', sort = 'reco';

  var head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = '<div><h1 class="page-title">Agent 市场</h1>' +
    '<p class="page-sub">按 token 或按时薪计价，认人不认模：挑选靠谱服务方，完成一个任务付一次钱。</p></div>';
  var headBtns = document.createElement('div');
  headBtns.appendChild(UI.btn({ label: '上架我的 Agent', icon: 'upload', variant: 'primary', onClick: function () { R.nav('/connect'); } }));
  head.appendChild(headBtns);
  root.appendChild(head);

  var filters = document.createElement('div');
  filters.className = 'mk-filters';
  var searchWrap = document.createElement('div');
  searchWrap.className = 'mk-search';
  searchWrap.innerHTML = I('search', 16);
  var searchInput = UI.input({ placeholder: '搜索 Agent、服务方或标签…', onInput: function (v) { q = v.toLowerCase(); renderGrid(); } });
  searchWrap.appendChild(searchInput);
  filters.appendChild(searchWrap);
  var sortSeg = UI.segmented({
    options: [
      { value: 'reco', label: '综合' },
      { value: 'price', label: '价格从低' },
      { value: 'orders', label: '接单最多' }
    ],
    value: sort,
    onChange: function (v) { sort = v; renderGrid(); }
  });
  filters.appendChild(sortSeg);
  root.appendChild(filters);

  var catWrap = document.createElement('div');
  catWrap.style.cssText = 'margin-bottom:16px; overflow-x:auto; padding-bottom:2px;';
  var catTabs = UI.tabs({ variant: 'pill', items: CATS, value: cat, onChange: function (v) { cat = v; renderGrid(); } });
  catWrap.appendChild(catTabs);
  root.appendChild(catWrap);

  var count = document.createElement('div');
  count.className = 'mk-count';
  root.appendChild(count);

  var grid = document.createElement('div');
  grid.className = 'mk-grid';
  root.appendChild(grid);

  function visible() {
    var list = data.marketplace.filter(function (a) {
      if (cat && a.cat !== cat) return false;
      if (!q) return true;
      var hay = (a.name + ' ' + a.vendor + ' ' + a.tags.join(' ') + ' ' + a.desc).toLowerCase();
      return hay.indexOf(q) > -1;
    });
    if (sort === 'price') list = list.slice().sort(function (a, b) { return a.priceNum - b.priceNum; });
    else if (sort === 'orders') list = list.slice().sort(function (a, b) { return b.orders - a.orders; });
    return list;
  }

  function renderGrid() {
    grid.innerHTML = '';
    var list = visible();
    count.innerHTML = '共 <b style="color:var(--text-strong)">' + list.length + '</b> 个在售 Agent';
    if (!list.length) {
      grid.appendChild(UI.empty({ icon: 'search', title: '没有匹配的 Agent', desc: '换个关键词或分类试试。', action: UI.btn({ label: '清除筛选', onClick: function () { q = ''; cat = ''; searchInput.value = ''; renderGrid(); } }) }));
      return;
    }
    list.forEach(function (a) { grid.appendChild(mkCard(a)); });
  }

  function mkCard(a) {
    var card = document.createElement('div');
    card.className = 'mk-card' + (a.featured ? ' featured' : '');
    if (a.featured) card.insertAdjacentHTML('afterbegin', '<span class="mk-badge">POPULAR</span>');
    var top = document.createElement('div');
    top.className = 'mk-top';
    top.appendChild(icoBox(a));
    var tInfo = document.createElement('div');
    tInfo.style.cssText = 'min-width:0;';
    var nm = document.createElement('div');
    nm.className = 'mk-name';
    nm.appendChild(document.createTextNode(a.name));
    nm.appendChild(UI.statusDot(a.online ? 'online' : 'offline', a.online ? '在线' : '离线'));
    var vendor = document.createElement('div');
    vendor.className = 'mk-vendor';
    vendor.appendChild(UI.avatar({ name: a.vendor, size: 17, color: '#1a73e8' }));
    vendor.appendChild(document.createTextNode(a.vendor));
    vendor.appendChild(UI.rating({ value: a.rating }));
    vendor.appendChild(document.createTextNode('· ' + D.fmtNum(a.orders) + ' 接单'));
    tInfo.appendChild(nm); tInfo.appendChild(vendor);
    top.appendChild(tInfo);
    var desc = document.createElement('div');
    desc.className = 'mk-desc';
    desc.textContent = a.desc;
    var tags = document.createElement('div');
    tags.className = 'mk-tags';
    a.tags.forEach(function (t) { tags.appendChild(UI.tag({ text: t })); });
    var foot = document.createElement('div');
    foot.className = 'mk-foot';
    foot.innerHTML = '<span class="mk-price">' + esc(a.price) + '</span>';
    foot.appendChild(UI.btn({ label: '调用', icon: 'zap', variant: 'primary', size: 'sm', onClick: function (ev) { ev.stopPropagation(); callAgent(a); } }));
    card.appendChild(top); card.appendChild(desc); card.appendChild(tags); card.appendChild(foot);
    card.addEventListener('click', function () { detail(a); });
    return card;
  }

  function icoBox(a) {
    var box = document.createElement('span');
    box.className = 'mk-ico';
    var isBrand = ['codex', 'claude', 'openclaw', 'hermes'].indexOf(a.icon) > -1;
    if (isBrand) {
      box.innerHTML = window.ResolveIcons.brand(a.icon, { size: 28 });
    } else {
      box.style.background = D.hexA(a.accent, 0.12);
      box.style.color = a.accent;
      box.innerHTML = I(a.icon, 20);
    }
    return box;
  }

  function detail(a) {
    var body = document.createElement('div');
    var top = document.createElement('div');
    top.className = 'mk-top';
    top.appendChild(icoBox(a));
    var info = document.createElement('div');
    info.style.cssText = 'min-width:0;';
    var nm = document.createElement('div');
    nm.className = 'mk-name';
    nm.appendChild(document.createTextNode(a.name));
    nm.appendChild(UI.statusDot(a.online ? 'online' : 'offline', a.online ? '在线' : '离线'));
    var vendor = document.createElement('div');
    vendor.className = 'mk-vendor';
    vendor.appendChild(UI.avatar({ name: a.vendor, size: 18, color: '#1a73e8' }));
    vendor.appendChild(document.createTextNode(a.vendor + ' · github.com/' + a.vendorGithub));
    vendor.appendChild(UI.rating({ value: a.rating }));
    info.appendChild(nm); info.appendChild(vendor);
    top.appendChild(info);
    var desc = document.createElement('p');
    desc.style.cssText = 'margin:0; font-size:13.5px; color:var(--text-mid); line-height:1.75;';
    desc.textContent = a.desc;
    var lines = document.createElement('div');
    lines.innerHTML =
      '<div class="quote-line"><span class="k">计费方式</span><span class="v">' + esc(a.price) + '</span></div>' +
      '<div class="quote-line"><span class="k">可用模型</span><span class="v">' + esc(a.models.join(' · ')) + '</span></div>' +
      '<div class="quote-line"><span class="k">服务保障</span><span class="v">' + esc(a.sla) + '</span></div>' +
      '<div class="quote-line"><span class="k">成交</span><span class="v">' + D.fmtNum(a.orders) + ' 单 · 好评率 98%+</span></div>';
    var reviews = document.createElement('div');
    reviews.style.cssText = 'display:flex; flex-direction:column; gap:2px;';
    var rv1 = { name: '杨过', time: '3 天前', rating: 5, text: '复述精确，输出的重构方案可直接合入，省了很多沟通成本。' };
    var rv2 = { name: '林小满', time: '1 周前', rating: 4.5, text: '响应很快，中途节点短暂离线但自动续跑了，结果完整。' };
    [rv1, rv2].forEach(function (rv) {
      var row = document.createElement('div');
      row.className = 'review-row';
      var hh = document.createElement('div');
      hh.className = 'review-head';
      hh.appendChild(UI.avatar({ name: rv.name, size: 24 }));
      hh.appendChild(document.createTextNode(rv.name));
      hh.appendChild(document.createTextNode(' · '));
      hh.appendChild(document.createTextNode(rv.time));
      hh.appendChild(UI.rating({ value: rv.rating }));
      var bb = document.createElement('div');
      bb.className = 'review-body';
      bb.textContent = rv.text;
      row.appendChild(hh); row.appendChild(bb);
      reviews.appendChild(row);
    });
    body.appendChild(top); body.appendChild(desc); body.appendChild(lines); body.appendChild(reviews);

    var m = UI.modal({ title: a.name, subtitle: 'Agent 详情', body: body, footer: [] });
    var foot = m.querySelector('.modal-foot');
    if (foot) {
      foot.appendChild(UI.btn({ label: '收藏', icon: 'heart', onClick: function () { UI.toast({ type: 'success', title: '已收藏', desc: a.name + ' 已加入你的收藏' }); } }));
      foot.appendChild(UI.btn({ label: '发起调用', icon: 'zap', variant: 'primary', onClick: function () { m.close(); callAgent(a); } }));
    }
  }

  /* ---------- 发起调用 ---------- */
  function callAgent(a) {
    var isHourly = /\/h$/.test(a.price);
    var tokens = Math.round((6 + Math.random() * 16) * 1000);
    var cost = isHourly ? Math.round((0.1 + Math.random() * 0.3) * 100) / 100 : Math.round(a.priceNum * tokens / 1000 * 100) / 100;
    var est = (isHourly ? '约 ' + Math.round((cost / a.priceNum) * 60) + ' 分钟' : '约 ' + D.fmtNum(tokens) + ' token');
    var balance = data.wallet.balance;

    var body = document.createElement('div');
    body.className = 'call-modal';
    body.innerHTML =
      '<div class="mk-top"><span class="mk-ico" style="background:' + D.hexA(a.accent, 0.12) + ';color:' + a.accent + ';">' + I(a.icon, 20) + '</span>' +
      '<div><div class="mk-name">' + esc(a.name) + '</div><div class="mk-vendor">' + esc(a.vendor) + '</div></div></div>';
    var ta = document.createElement('textarea');
    ta.className = 'inp';
    ta.rows = 3;
    ta.placeholder = '描述你的任务，例如：帮我重构 login 模块的鉴权逻辑，并补充单元测试。';
    ta.style.cssText = 'resize:vertical;';
    body.appendChild(ta);
    var lines = document.createElement('div');
    lines.innerHTML =
      '<div class="quote-line"><span class="k">预估消耗</span><span class="v">' + est + '</span></div>' +
      '<div class="quote-line"><span class="k">预估费用</span><span class="v" style="color:var(--brand);">' + D.money(cost) + '</span></div>' +
      '<div class="quote-line"><span class="k">账户余额</span><span class="v">' + D.money(balance) + '</span></div>';
    body.appendChild(lines);

    var m = UI.modal({ title: '发起调用', subtitle: '确认后从余额预扣执行费用', body: body, footer: [] });
    var foot = m.querySelector('.modal-foot');
    if (foot) {
      foot.appendChild(UI.btn({ label: '取消', onClick: function () { m.close(); } }));
      foot.appendChild(UI.btn({
        label: '确认支付 ' + D.money(cost), icon: 'check', variant: 'primary',
        onClick: function (ev, btn) {
          if (balance < cost) {
            UI.toast({ type: 'error', title: '余额不足', desc: '还差 ' + D.money(cost - balance) + '，请先充值' });
            btn.disabled = true;
            return;
          }
          runCall(a, cost, m);
        }
      }));
    }
  }

  function runCall(a, cost, preModal) {
    var body = document.createElement('div');
    body.className = 'call-modal';
    var steps = ['连接服务商节点', '打包任务上下文', '调用 ' + a.name + ' 执行', '校验结果并结算'];
    var progWrap = document.createElement('div');
    progWrap.className = 'call-progress';
    var prog = UI.progress({ value: 0 });
    progWrap.appendChild(prog);
    var logs = document.createElement('div');
    logs.className = 'call-log';
    body.appendChild(progWrap);
    body.appendChild(logs);
    var status = document.createElement('div');
    status.style.cssText = 'font-size:13px; color:var(--text-mid);';
    body.appendChild(status);

    preModal.setBody(body);
    var foot = preModal.querySelector('.modal-foot');
    if (foot) foot.innerHTML = '';

    var i = 0;
    var finalCost = Math.round((cost * (0.86 + Math.random() * 0.14)) * 100) / 100;
    var tick = setInterval(function () {
      i += 9;
      var p = Math.min(96, i);
      prog.querySelector('.p-fill').style.width = p + '%';
      if (i < 30) status.textContent = '阶段 1/4 · 建立安全通道';
      else if (i < 55) status.textContent = '阶段 2/4 · 上下文打包 ' + Math.round((i - 30) * 2) + ' KB';
      else if (i < 85) status.textContent = '阶段 3/4 · Agent 执行中，真实消耗结算中';
      else status.textContent = '阶段 4/4 · 结果校验与结算';
      if (i >= 96) {
        clearInterval(tick);
        prog.querySelector('.p-fill').style.width = '100%';
        logs.innerHTML =
          '<div>连接节点 <span class="ok">' + I('check', 12) + '</span></div>' +
          '<div>任务分发 <span class="ok">' + I('check', 12) + '</span></div>' +
          '<div>' + esc(a.name) + ' 执行完成 · <span class="ok">' + D.money(finalCost) + '</span></div>' +
          '<div>多退少补已结算，请查看钱包流水</div>';
        status.innerHTML = '<span style="color:var(--ok); font-weight:600;">调用完成</span> · 实付 ' + D.money(finalCost);
        D.spend(finalCost, a.name);
        UI.toast({ type: 'success', title: '调用完成', desc: a.name + ' · ' + D.money(finalCost) });
        var doneBtn = UI.btn({ label: '完成', variant: 'primary', onClick: function () { preModal.close(); } });
        foot.appendChild(doneBtn);
      }
    }, 160);
  }

  renderGrid();
  return root;
};