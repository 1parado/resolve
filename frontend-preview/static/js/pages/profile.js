/* ==========================================================================
   pages/profile.js — 个人主页（产品中心页）
   头像 / 名称 / 职业 / 运行环境 / 拥有的 Agents / 成交量热力图 / 在线节点 / 最近成交
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.profile = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter, HM = window.ResolveHeatmap;
  var I = UI.I, esc = D.esc, T = window.ResolveI18N.T;

  var data = D.get();
  var me = D.me();
  var st = D.stats();
  var root = document.createElement('div');
  root.className = 'page';

  /* ---------- 页头 ---------- */
  var head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = '<div><h1 class="page-title">' + T('个人主页') + '</h1>' +
    '<p class="page-sub">' + T('你的公开身份与在线节点，其他用户可见、可调。成交量按天记录，最近 53 周可回溯。') + '</p></div>';
  root.appendChild(head);

  /* ---------- 身份卡 ---------- */
  var hero = document.createElement('div');
  hero.className = 'card';
  hero.innerHTML = '<div class="card-body"><div class="profile-hero"></div></div>';
  var heroInner = hero.querySelector('.profile-hero');
  var os = data.profile.os;
  heroInner.appendChild(UI.avatar({ name: me.github || me.name, src: D.identicon(me.github || me.name, 160), size: 78, color: me.color }));
  var info = document.createElement('div');
  var nameRow = document.createElement('div');
  nameRow.className = 'pf-name';
  nameRow.appendChild(document.createTextNode(me.name));
  nameRow.appendChild(UI.tag({ text: T('认证服务商'), variant: 'brand', dot: true }));
  info.appendChild(nameRow);
  var job = document.createElement('div'); job.className = 'pf-job'; job.textContent = data.profile.job;
  var meta = document.createElement('div'); meta.className = 'pf-meta';
  meta.appendChild(UI.osBadge(os));
  var gh = document.createElement('a'); gh.className = 'pf-github'; gh.href = 'https://github.com/' + me.github; gh.target = '_blank';
  gh.innerHTML = window.ResolveIcons.brand('github', { size: 15 }) + '<span>github.com/' + esc(me.github) + '</span>';
  meta.appendChild(gh);
  var jd = document.createElement('span'); jd.className = 'pf-joined';
  jd.innerHTML = I('calendar', 14) + '<span>' + T('加入于 {d}', { d: esc(data.profile.joined) }) + '</span>';
  meta.appendChild(jd);
  var bio = document.createElement('p'); bio.className = 'pf-bio'; bio.textContent = data.profile.bio;
  info.appendChild(job); info.appendChild(meta); info.appendChild(bio);
  heroInner.appendChild(info);
  var heroActions = document.createElement('div');
  heroActions.className = 'pf-actions';
  heroActions.appendChild(UI.btn({ label: T('编辑资料'), icon: 'edit', onClick: editProfile }));
  heroActions.appendChild(UI.btn({ label: T('接入 Agent'), icon: 'plug', variant: 'primary', onClick: function () { R.nav('/connect'); } }));
  heroInner.appendChild(heroActions);
  root.appendChild(hero);

  /* ---------- 指标 ---------- */
  var stats = document.createElement('div');
  stats.className = 'grid grid-4';
  stats.appendChild(UI.stat({ icon: 'zap', label: T('今日成交量'), value: st.today + T(' 单'), hint: T('实时'), accent: true }));
  stats.appendChild(UI.stat({ icon: 'trending-up', label: T('本周成交量'), value: st.week + T(' 单') }));
  stats.appendChild(UI.stat({ icon: 'check-circle', label: T('累计成交量'), value: D.fmtNum(st.total) + T(' 单') }));
  stats.appendChild(UI.stat({ icon: 'coins', label: T('本月收入'), value: D.money(st.revenue), accent: true }));
  root.appendChild(stats);

  /* ---------- 成交量热力图 ---------- */
  var heatCard = document.createElement('div');
  heatCard.className = 'card';
  heatCard.innerHTML = '<div class="card-head"><div><div class="card-title">' + I('grid', 15) + T('成交量热力图') + '</div>' +
    '<div class="card-sub">' + T('近 53 周 · 按天记录成交笔数') + '</div></div>' +
    '<span class="heat-total">' + T('累计 {n} 单', { n: D.fmtNum(st.total) }) + '</span></div>' +
    '<div class="card-body"><div class="heat-root"></div></div>';
  var heatRoot = heatCard.querySelector('.heat-root');
  root.appendChild(heatCard);

  /* ---------- 双栏：Agents / 节点 · 最近成交 ---------- */
  var grid = document.createElement('div');
  grid.className = 'grid grid-2';
  grid.style.cssText = 'grid-template-columns: 1.55fr 1fr; align-items: start;';
  grid.appendChild(agentsCard());
  var right = document.createElement('div');
  right.className = 'grid';
  right.appendChild(nodeCard());
  right.appendChild(txCard());
  grid.appendChild(right);
  root.appendChild(grid);

  /* --- Agents 卡 --- */
  function agentsCard() {
    var card = document.createElement('div');
    card.className = 'card';
    var headH = document.createElement('div');
    headH.className = 'card-head';
    headH.innerHTML = '<div><div class="card-title">' + I('cpu', 15) + T('我的 Agents') + '</div>' +
      '<div class="card-sub">' + T('已接入 {n} 个 Agent · 点击查看详情', { n: data.agents.length }) + '</div></div>';
    card.appendChild(headH);
    var body = document.createElement('div');
    body.className = 'card-body';
    body.style.cssText = 'display:flex; flex-direction:column; gap:12px;';
    data.agents.forEach(function (a) { body.appendChild(agentTile(a)); });
    var addBtn = UI.btn({
      label: T('接入新的 Agent'), icon: 'plus',
      onClick: function () { R.nav('/connect'); }
    });
    addBtn.style.cssText = 'border-style: dashed; width:100%; justify-content:center; color: var(--brand); background: var(--brand-soft); border-color: var(--brand-line);';
    addBtn.classList.add('ghost');
    body.appendChild(addBtn);
    card.appendChild(body);
    return card;
  }

  function agentTile(a) {
    var tile = document.createElement('div');
    tile.className = 'agent-tile';
    tile.style.cursor = 'pointer';
    var ico = document.createElement('span');
    ico.className = 'at-ico';
    ico.innerHTML = window.ResolveIcons.brand(a.icon, { size: 30 });
    var main = document.createElement('div');
    main.className = 'at-main';
    var nameRow = document.createElement('div');
    nameRow.className = 'at-name';
    nameRow.appendChild(document.createTextNode(a.name));
    nameRow.appendChild(UI.statusDot(a.status, a.status === 'online' ? T('在线') : a.status === 'standby' ? T('待命') : T('离线')));
    var prod = document.createElement('div'); prod.className = 'at-product'; prod.textContent = a.product;
    var models = document.createElement('div'); models.className = 'at-models';
    a.models.forEach(function (m) { models.appendChild(modelChip(m)); });
    var foot = document.createElement('div'); foot.className = 'at-foot';
    foot.innerHTML = '<span class="at-price"><b>' + esc(a.price) + '</b>' + esc(a.unit) + '</span>';
    var tags = document.createElement('span'); tags.className = 'mk-tags';
    a.tags.forEach(function (t) { tags.appendChild(UI.tag({ text: t })); });
    foot.appendChild(tags);
    main.appendChild(nameRow); main.appendChild(prod); main.appendChild(models); main.appendChild(foot);
    tile.appendChild(ico); tile.appendChild(main);
    tile.addEventListener('click', function () { agentDetail(a); });
    return tile;
  }

  function modelChip(name, color) {
    var c = document.createElement('span');
    c.className = 'model-chip';
    c.innerHTML = '<span class="m-dot" style="background:' + (color || 'var(--brand)') + '"></span>' + esc(name);
    return c;
  }

  function agentDetail(a) {
    var body = document.createElement('div');
    body.style.cssText = 'display:flex; flex-direction:column; gap:14px;';
    body.appendChild(UI.tag({ text: a.tags.join(' · '), variant: 'brand' }));
    var desc = document.createElement('p'); desc.style.cssText = 'margin:0; font-size:13.5px; color:var(--text-mid); line-height:1.7;';
    desc.textContent = a.desc;
    body.appendChild(desc);
    var lines = document.createElement('div');
    lines.innerHTML =
      '<div class="quote-line"><span class="k">' + T('模型矩阵') + '</span><span class="v">' + esc(a.models.join(' · ')) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('计费方式') + '</span><span class="v">' + esc(a.price) + esc(a.unit) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('运行位置') + '</span><span class="v">' + (a.id === 'openclaw' ? T('本地节点 · 数据不出机') : T('本地节点')) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('当前状态') + '</span><span class="v">' + (a.status === 'online' ? T('在线可调') : a.status === 'standby' ? T('待命中') : T('离线')) + '</span></div>';
    body.appendChild(lines);
    var m = UI.modal({ title: a.name, subtitle: a.product, body: body, footer: [] });
    var foot = m.querySelector('.modal-foot');
    if (foot) {
      foot.appendChild(UI.btn({ label: T('复制分享链接'), icon: 'copy', onClick: function () {
        var link = 'resolve.app/agents/' + a.id;
        var done = function () { UI.toast({ type: 'success', title: T('分享链接已复制'), desc: link }); };
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(done).catch(done); else done();
      } }));
      foot.appendChild(UI.btn({ label: T('关闭'), variant: 'primary', onClick: function () { m.close(); } }));
    }
  }

  /* --- 在线节点卡 --- */
  function nodeCard() {
    var card = document.createElement('div');
    card.className = 'card';
    var headH = document.createElement('div');
    headH.className = 'card-head';
    headH.innerHTML = '<div><div class="card-title">' + I('server', 15) + T('在线节点') + '</div>' +
      '<div class="card-sub">' + T('接入的本地 / 云端 Agent 载体') + '</div></div>';
    card.appendChild(headH);
    var body = document.createElement('div');
    body.className = 'card-body';
    var node = data.node;
    if (node.connected) {
      var nc = document.createElement('div');
      nc.className = 'node-card';
      var ico = document.createElement('span');
      ico.className = 'node-ico';
      ico.innerHTML = I('scan', 20);
      var main = document.createElement('div');
      main.className = 'node-main';
      var title = document.createElement('div');
      title.className = 'node-title';
      title.appendChild(document.createTextNode(node.name));
      title.appendChild(UI.statusDot('online', T('在线')));
      var meta = document.createElement('div');
      meta.className = 'node-meta';
      meta.appendChild(ipMono(node.ip + ':' + node.port));
      meta.appendChild(envBadge(node.runtime));
      meta.appendChild(UI.osBadge({ id: 'linux', label: 'Ubuntu 22.04' }));
      meta.appendChild(UI.tag({ text: node.visibility === 'public' ? T('全网公开') : T('仅企业内网'), variant: node.visibility === 'public' ? 'brand' : 'warn' }));
      main.appendChild(title); main.appendChild(meta);
      var mgr = UI.btn({ label: T('管理'), variant: 'ghost', size: 'sm', icon: 'settings', onClick: function () { R.nav('/connect'); } });
      nc.appendChild(ico); nc.appendChild(main); nc.appendChild(mgr);
      body.appendChild(nc);
      var agentsNote = document.createElement('div');
      agentsNote.style.cssText = 'margin-top:10px; font-size:12.5px; color:var(--text-faint);';
      agentsNote.innerHTML = T('发布时接入 {n} 个 Agent：', { n: node.agents.length });
      var chips = document.createElement('div');
      chips.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin-top:7px;';
      node.agents.forEach(function (id) {
        var a = data.agents.find(function (x) { return x.id === id; });
        if (a) chips.appendChild(UI.tag({ text: a.name, dot: a.accent, variant: a.status === 'online' ? 'ok' : 'default' }));
      });
      body.appendChild(agentsNote); body.appendChild(chips);
    } else {
      var empty = UI.empty({
        icon: 'plug',
        title: T('尚未接入节点'),
        desc: T('扫描本地或云端 Agent，可视化配置 IP、端口与模型后一键发布到个人主页。'),
        action: UI.btn({ label: T('立即接入'), icon: 'scan', variant: 'primary', onClick: function () { R.nav('/connect'); } })
      });
      body.appendChild(empty);
    }
    card.appendChild(body);
    return card;
  }

  /* --- 最近成交卡 --- */
  function txCard() {
    var card = document.createElement('div');
    card.className = 'card';
    var headH = document.createElement('div');
    headH.className = 'card-head';
    headH.innerHTML = '<div><div class="card-title">' + I('clock', 15) + T('最近成交') + '</div>' +
      '<div class="card-sub">' + data.billing.length + T(' 条流水') + '</div></div>';
    var more = document.createElement('a');
    more.href = '#/wallet';
    more.style.cssText = 'font-size:12.5px; color:var(--brand); text-decoration:none;';
    more.textContent = T('全部流水');
    headH.appendChild(more);
    card.appendChild(headH);
    var body = document.createElement('div');
    body.className = 'card-body';
    var list = document.createElement('div');
    list.className = 'tx-list';
    data.billing.slice(0, 5).forEach(function (b) { list.appendChild(txRow(b)); });
    body.appendChild(list);
    card.appendChild(body);
    return card;
  }

  function txRow(b) {
    var row = document.createElement('div');
    row.className = 'tx-row';
    var isRecharge = b.type === 'recharge';
    var isWithdraw = b.type === 'withdraw';
    var ico = document.createElement('span');
    ico.className = 'tx-ico';
    var ic = isRecharge ? 'download' : (isWithdraw ? 'upload' : 'zap');
    var bg = isRecharge ? 'var(--ok-soft); color:#059669' : (isWithdraw ? 'var(--surface-soft); color:var(--text-mid)' : 'var(--brand-soft); color:var(--brand)');
    ico.style.cssText = 'background:' + bg;
    ico.innerHTML = I(ic, 16);
    var main = document.createElement('div');
    main.className = 'tx-main';
    var nm = document.createElement('div'); nm.className = 'tx-name';
    nm.textContent = T(isRecharge ? '充值 · {a}' : isWithdraw ? '提现 · {a}' : '调用 · {a}', { a: b.agent });
    var tm = document.createElement('div'); tm.className = 'tx-time';
    tm.textContent = D.timeAgo(b.time);
    main.appendChild(nm); main.appendChild(tm);
    var amt = document.createElement('span');
    amt.className = 'tx-amount' + (b.amount > 0 ? ' pos' : '');
    amt.textContent = (b.amount > 0 ? '+' : '') + D.money(b.amount);
    row.appendChild(ico); row.appendChild(main); row.appendChild(amt);
    return row;
  }

  /* ---------- 工具 ---------- */
  function ipMono(t) { var s = document.createElement('span'); s.className = 'ip-mono'; s.textContent = t; return s; }
  function envBadge(rt) {
    var s = document.createElement('span');
    s.className = 'env-badge';
    s.innerHTML = I(rt && rt.type === 'docker' ? 'layers' : 'terminal', 13) + '<span>' + esc(rt.label || 'Node') + '</span>';
    return s;
  }

  /* ---------- 编辑资料 ---------- */
  function editProfile() {
    var fmt = document.createElement('div');
    fmt.style.cssText = 'display:flex; flex-direction:column; gap:14px;';
    var fName = UI.field({ label: T('名称'), value: data.profile.name, id: 'pf-name' });
    var fJob = UI.field({ label: T('职业'), value: data.profile.job, id: 'pf-job' });
    var fGithub = UI.field({ label: T('GitHub 用户名'), value: data.profile.github, placeholder: 'your-name', id: 'pf-gh' });
    var osWrap = document.createElement('div');
    osWrap.className = 'field';
    osWrap.innerHTML = '<label class="fl" for="pf-os">' + T('运行环境') + '</label><select class="inp" id="pf-os">' +
      '<option value="macos">macOS</option><option value="windows">Windows</option><option value="linux">Linux</option></select>';
    osWrap.querySelector('select').value = data.profile.os.id;
    var bioF = document.createElement('div');
    bioF.className = 'field';
    bioF.innerHTML = '<label class="fl" for="pf-bio">' + T('个人简介') + '</label><textarea class="inp" id="pf-bio" rows="3" style="resize:vertical">' + esc(data.profile.bio) + '</textarea>';
    var osLabel = {
      macos: 'macOS 15.1',
      windows: 'Windows 11',
      linux: 'Linux Ubuntu 24.04'
    };
    var m = UI.modal({
      title: T('编辑资料'), subtitle: T('这些信息会在个人主页公开'),
      body: fmt,
      footer: [
        UI.btn({ label: T('取消'), onClick: function () { m.close(); } }),
        UI.btn({ label: T('保存修改'), variant: 'primary', onClick: function () {
          var p = data.profile;
          p.name = fName.input.value.trim() || p.name;
          p.job = fJob.input.value.trim() || p.job;
          p.github = fGithub.input.value.trim().replace(/^@/, '') || p.github;
          var osId = osWrap.querySelector('select').value;
          p.os = { id: osId, label: osLabel[osId] };
          p.bio = bioF.querySelector('textarea').value.trim() || p.bio;
          D.set();
          m.close();
          UI.toast({ type: 'success', title: T('资料已更新') });
          R.run();
        } })
      ]
    });
  }

  /* ---------- 渲染热力图 ---------- */
  HM.render(heatRoot, D.heatmap());

  return root;
};