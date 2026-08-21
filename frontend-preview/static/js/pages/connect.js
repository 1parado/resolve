/* ==========================================================================
   pages/connect.js — 接入向导：扫描 → 发现 → 配置 → 发布
   可视化 IP / 端口 / 运行时 / Agents / 模型，发布后上架到个人主页
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.connect = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I, esc = D.esc, T = window.ResolveI18N.T;

  var data = D.get();
  var root = document.createElement('div');
  root.className = 'page';

  var STEPS = [T('扫描'), T('发现'), T('配置'), T('发布')];
  var state = { step: 0, publishing: false };
  var timers = [];

  var DISCOVERY = {
    ip: '192.168.1.24', port: '41521', protocol: 'WebSocket · TLS',
    runtime: { type: 'docker', label: 'Docker · Ubuntu 22.04' },
    os: { id: 'linux', label: 'Ubuntu 22.04' },
    agents: [
      { id: 'codex', name: 'Codex', status: 'online' },
      { id: 'claudecode', name: 'Claude Code', status: 'online' },
      { id: 'openclaw', name: 'OpenClaw', status: 'online' },
      { id: 'hermes', name: 'Hermes', status: 'standby' }
    ]
  };
  var cfg = {
    name: (data.node.connected && data.node.name) ? data.node.name : 'MacBook-Pro 节点',
    ip: (data.node.connected && data.node.ip) || DISCOVERY.ip,
    port: (data.node.connected && data.node.port) || DISCOVERY.port,
    visibility: (data.node.connected && data.node.visibility) || 'public',
    enabled: { codex: true, claudecode: true, openclaw: true, hermes: true }
  };

  function clearTimers() { timers.forEach(clearInterval); timers = []; }

  /* ---------- 页头 ---------- */
  var head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = '<div><h1 class="page-title">' + T('接入 Agent') + '</h1>' +
    '<p class="page-sub">' + T('本地扫盘发现运行中的 Agent 服务，可视化配置后一键发布到个人主页与市场。') + '</p></div>';
  if (data.node.connected) {
    head.appendChild(UI.tag({ text: T('已发布节点 · 再次发布将覆盖'), variant: 'warn', icon: 'info' }));
  }
  root.appendChild(head);

  var wizard = document.createElement('div');
  wizard.className = 'wizard card';
  wizard.innerHTML = '<div class="card-body"></div>';
  var body = wizard.querySelector('.card-body');
  root.appendChild(wizard);

  /* ---------- 渲染 ---------- */
  function render() {
    clearTimers();
    body.innerHTML = '';
    body.appendChild(UI.stepper({ steps: STEPS, current: state.step }));
    var stepWrap = document.createElement('div');
    stepWrap.className = 'wizard-step';
    stepWrap.style.cssText = 'margin-top: 22px;';
    body.appendChild(stepWrap);

    if (state.step === 0) renderScan(stepWrap);
    else if (state.step === 1) renderDiscover(stepWrap);
    else if (state.step === 2) renderConfigure(stepWrap);
    else renderPublish(stepWrap);
  }

  /* ---------- 0 扫描 ---------- */
  function renderScan(el) {
    var card = document.createElement('div');
    card.className = 'scan-card card';
    card.innerHTML =
      '<div class="scan-ring"><span class="scan-core">' + I('scan', 32) + '</span></div>' +
      '<div class="scan-title">' + T('正在扫描本地与云端环境') + '</div>' +
      '<div class="scan-desc">' + T('探测局域网设备、本地端口与已安装的 Agent 运行时，请保持设备在线。') + '</div>';
    var progWrap = document.createElement('div');
    progWrap.className = 'scan-progress';
    var prog = UI.progress({ value: 0 });
    progWrap.appendChild(prog);
    card.appendChild(progWrap);
    var logs = document.createElement('div');
    logs.className = 'scan-logs';
    logs.id = 'scanLogs';
    card.appendChild(logs);
    var skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'scan-skip';
    skip.style.cssText = 'font-size:12px; color:var(--text-faint); background:none; border:none; cursor:pointer; margin-top:10px; text-decoration:underline;';
    skip.textContent = T('等待太久？跳过扫描');
    skip.addEventListener('click', function () { go(1); });
    card.appendChild(skip);
    el.appendChild(card);

    var lines = [
      { t: 200, txt: T('正在探测局域网 {n} …', { n: '<span class="hl">192.168.1.0/24</span>' }) },
      { t: 650, txt: T('发现 {n} 台设备 · 1 台在线', { n: '<span class="hl">3</span>' }) },
      { t: 1050, txt: T('检测到本地服务 {s}', { s: '<span class="ok">resolve-agent-core v2.4.1</span>' }) },
      { t: 1450, txt: T('读取节点能力清单：Agents / Models / Runtime …') },
      { t: 1850, txt: T('握手成功 · {w}', { w: '<span class="ok">通过 WebSocket 建立连接</span>' }) },
      { t: 2300, txt: T('扫描完成，共发现 {n} 个 Agent', { n: '<span class="hl">4</span>' }) }
    ];
    var progress = 0;
    var tick = setInterval(function () {
      progress = Math.min(100, progress + 3.4);
      prog.querySelector('.p-fill').style.width = progress + '%';
    }, 60);
    timers.push(tick);
    lines.forEach(function (l) {
      var t = setTimeout(function () {
        var div = document.createElement('div');
        div.innerHTML = l.txt + (l.t === lines[lines.length - 1].t ? '' : '<span class="live"></span>');
        logs.appendChild(div);
      }, l.t);
      timers.push(t);
    });
    var done = setTimeout(function () {
      logs.innerHTML += '<div><span class="ok">' + I('check', 12) + ' ' + T('扫描完成') + '</span></div>';
      go(1);
    }, 2600);
    timers.push(done);
  }

  /* ---------- 1 发现 ---------- */
  function renderDiscover(el) {
    var title = document.createElement('div');
    title.innerHTML = '<div class="scan-title">' + T('发现节点 · resolve-agent-core') + '</div>' +
      '<div class="scan-desc" style="margin-top:5px;">' + T('以下是扫描到的设备信息与可接入的 Agent，确认后进入配置。') + '</div>';
    el.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'nv-grid';
    grid.style.cssText = 'margin-top: 16px;';
    var items = [
      { label: T('IP 地址'), icon: 'globe', val: DISCOVERY.ip },
      { label: T('服务端口'), icon: 'plug', val: DISCOVERY.port },
      { label: T('运行时环境'), icon: 'layers', val: DISCOVERY.runtime.label, mono: false },
      { label: T('通信协议'), icon: 'lock', val: DISCOVERY.protocol, mono: false }
    ];
    items.forEach(function (it) {
      var n = document.createElement('div');
      n.className = 'nv-item';
      n.innerHTML = '<div class="nv-label">' + I(it.icon, 13) + esc(it.label) + '</div>' +
        '<div class="nv-value" style="font-family:' + (it.mono === false ? 'var(--font-body)' : 'var(--font-mono)') + '">' + esc(it.val) + '</div>';
      grid.appendChild(n);
    });
    el.appendChild(grid);

    var agentsCard = document.createElement('div');
    agentsCard.className = 'card';
    agentsCard.style.cssText = 'margin-top: 14px;';
    agentsCard.innerHTML = '<div class="card-head"><div><div class="card-title">' + I('cpu', 15) + T('检测到的 Agent') + '</div>' +
      '<div class="card-sub">' + T('共 {n} 个 · 可勾选接入', { n: DISCOVERY.agents.length }) + '</div></div></div>';
    var abody = document.createElement('div');
    abody.className = 'card-body';
    abody.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
    DISCOVERY.agents.forEach(function (a) {
      var raw = data.agents.find(function (x) { return x.id === a.id; });
      var row = document.createElement('div');
      row.className = 'agent-tile';
      var ico = document.createElement('span');
      ico.className = 'at-ico';
      ico.innerHTML = window.ResolveIcons.brand(raw.icon, { size: 30 });
      var main = document.createElement('div');
      main.className = 'at-main';
      var nm = document.createElement('div');
      nm.className = 'at-name';
      nm.appendChild(document.createTextNode(a.name));
      nm.appendChild(UI.statusDot(a.status, a.status === 'online' ? T('在线') : T('待命')));
      var pr = document.createElement('div'); pr.className = 'at-product'; pr.textContent = raw.product;
      var models = document.createElement('div'); models.className = 'at-models';
      raw.models.forEach(function (m) { models.appendChild(UI.tag({ text: m, variant: 'default' })); });
      main.appendChild(nm); main.appendChild(pr); main.appendChild(models);
      row.appendChild(ico); row.appendChild(main);
      abody.appendChild(row);
    });
    agentsCard.appendChild(abody);
    el.appendChild(agentsCard);

    el.appendChild(foot([UI.btn({ label: T('返回重扫'), icon: 'refresh', onClick: function () { state.step = 0; render(); } }),
      UI.btn({ label: T('进入配置'), icon: 'chev-right', variant: 'primary', onClick: function () { go(2); } })]));
  }

  /* ---------- 2 配置 ---------- */
  function renderConfigure(el) {
    var title = document.createElement('div');
    title.innerHTML = '<div class="scan-title">' + T('配置节点与定价') + '</div>' +
      '<div class="scan-desc" style="margin-top:5px;">' + T('确认接入参数、可见范围与各 Agent 的上架状态。') + '</div>';
    el.appendChild(title);

    var panel = document.createElement('div');
    panel.className = 'card';
    panel.style.cssText = 'margin-top:16px;';
    var pbody = document.createElement('div');
    pbody.className = 'card-body';

    var fName = UI.field({ label: T('节点名称'), value: cfg.name, placeholder: T('例如 MacBook-Pro 节点') });
    var row2 = document.createElement('div');
    row2.style.cssText = 'display:flex; gap:12px; margin-top:14px;';
    var fIp = UI.field({ label: T('IP 地址'), value: cfg.ip, placeholder: '0.0.0.0' });
    var fPort = UI.field({ label: T('服务端口'), value: cfg.port, placeholder: '41521' });
    row2.appendChild(fIp); row2.appendChild(fPort);

    var visF = document.createElement('div');
    visF.className = 'field';
    visF.style.cssText = 'margin-top:14px;';
    visF.innerHTML = '<label class="fl">' + T('可见范围') + '</label>';
    var visRow = document.createElement('div');
    visRow.style.cssText = 'display:flex; gap:10px; margin-top:7px;';
    var visSeg = UI.segmented({
      options: [
        { value: 'public', label: T('全网公开'), icon: 'globe' },
        { value: 'enterprise', label: T('仅企业内网'), icon: 'building' }
      ],
      value: cfg.visibility,
      onChange: function (v) { cfg.visibility = v; }
    });
    visRow.appendChild(visSeg);
    visF.appendChild(visRow);
    pbody.appendChild(fName); pbody.appendChild(row2); pbody.appendChild(visF);

    var agTitle = document.createElement('div');
    agTitle.className = 'card-title';
    agTitle.style.cssText = 'margin-top:18px;';
    agTitle.innerHTML = I('cpu', 15) + T('上架的 Agent');
    pbody.appendChild(agTitle);

    var agWrap = document.createElement('div');
    agWrap.style.cssText = 'display:flex; flex-direction:column; margin-top:4px;';
    DISCOVERY.agents.forEach(function (a) {
      var raw = data.agents.find(function (x) { return x.id === a.id; });
      var row = document.createElement('div');
      row.className = 'cfg-row';
      var left = document.createElement('div');
      var nm = document.createElement('div');
      nm.className = 'cfg-name';
      nm.innerHTML = '<span class="cfg-ico">' + I('zap', 15) + '</span>' + esc(a.name);
      var ds = document.createElement('div');
      ds.className = 'cfg-desc';
      ds.textContent = raw.price + raw.unit + ' · ' + raw.models.join(' · ');
      left.appendChild(nm); left.appendChild(ds);
      var right = document.createElement('div');
      right.className = 'cfg-right';
      var sw = UI.switch({ checked: cfg.enabled[a.id] !== false, onChange: function (v) { cfg.enabled[a.id] = v; } });
      right.appendChild(sw);
      row.appendChild(left); row.appendChild(right);
      agWrap.appendChild(row);
    });
    pbody.appendChild(agWrap);

    var note = document.createElement('div');
    note.style.cssText = 'margin-top:14px; font-size:12px; color:var(--text-faint); display:flex; gap:6px; align-items:center;';
    note.innerHTML = I('info', 13) + ' ' + T('发布后可随时回到本页修改参数；关闭的 Agent 仍会占用节点但不会对外接单。');
    pbody.appendChild(note);

    panel.appendChild(pbody);
    el.appendChild(panel);

    el.appendChild(foot([
      UI.btn({ label: T('上一步'), icon: 'chev-left', onClick: function () { go(1); } }),
      UI.btn({ label: T('保存并发布'), icon: 'send', variant: 'primary', onClick: function () {
        cfg.name = fName.input.value.trim() || cfg.name;
        cfg.ip = fIp.input.value.trim() || cfg.ip;
        cfg.port = fPort.input.value.trim() || cfg.port;
        state.step = 3;
        render();
      } })
    ]));
  }

  /* ---------- 3 发布 ---------- */
  function renderPublish(el) {
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<div class="card-head"><div><div class="card-title">' + I('send', 15) + T('发布确认') + '</div>' +
      '<div class="card-sub">' + T('核对以下信息后一键发布到平台') + '</div></div></div>';
    var cbody = document.createElement('div');
    cbody.className = 'card-body';
    var enabledIds = Object.keys(cfg.enabled).filter(function (k) { return cfg.enabled[k]; });
    var enabledAgents = data.agents.filter(function (a) { return enabledIds.indexOf(a.id) > -1; });
    cbody.innerHTML =
      '<div class="quote-line"><span class="k">' + T('节点名称') + '</span><span class="v">' + esc(cfg.name) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('地址') + '</span><span class="v mono">' + esc(cfg.ip) + ':' + esc(cfg.port) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('运行时') + '</span><span class="v">' + esc(DISCOVERY.runtime.label) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('可见范围') + '</span><span class="v">' + (cfg.visibility === 'public' ? T('全网公开') : T('仅企业内网')) + '</span></div>' +
      '<div class="quote-line"><span class="k">' + T('上架 Agent') + '</span><span class="v">' + enabledAgents.map(function (a) { return a.name; }).join(' · ') + '</span></div>';
    card.appendChild(cbody);
    var cfoot = document.createElement('div');
    cfoot.className = 'card-foot';
    cfoot.style.cssText = 'justify-content:space-between; align-items:center;';
    var leftBtns = document.createElement('div');
    leftBtns.style.cssText = 'display:flex; gap:10px;';
    leftBtns.appendChild(UI.btn({ label: T('上一步'), icon: 'chev-left', onClick: function () { go(2); } }));
    cfoot.appendChild(leftBtns);
    var pubBtn = UI.btn({ label: T('发布到平台'), icon: 'upload', variant: 'primary', size: 'lg', disabled: state.publishing, onClick: publish });
    cfoot.appendChild(pubBtn);
    card.appendChild(cfoot);
    el.appendChild(card);
    el.appendChild(pubStatus(el, enabledAgents));
  }

  function pubStatus(el, enabledAgents) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:16px;';
    if (state.publishing) {
      wrap.innerHTML = '<div class="scan-card card"><div class="scan-ring"><span class="scan-core">' + I('upload', 30) + '</span></div>' +
        '<div class="scan-title">' + T('正在发布节点') + '</div><div class="scan-desc">' + T('注册到平台 · 鉴权 · 上架 Agent …') + '</div></div>';
      var progWrap = document.createElement('div');
      progWrap.className = 'scan-progress';
      var prog = UI.progress({ value: 0 });
      progWrap.appendChild(prog);
      wrap.appendChild(progWrap);
      var logs = document.createElement('div');
      logs.className = 'scan-logs';
      logs.style.cssText = 'max-width:100%; margin-top:12px;';
      wrap.appendChild(logs);
      var t1 = setTimeout(function () { logs.innerHTML = '<div>' + T('注册节点') + ' <span class="ok">' + I('check', 12) + '</span></div><div>' + T('建立安全通道') + ' <span class="ok">' + I('check', 12) + '</span></div><div class="live">' + T('上架 {n} 个 Agent', { n: enabledAgents.length }) + '</div>'; }, 500);
      var t2 = setTimeout(function () { logs.innerHTML += '<div>' + T('发布完成') + ' <span class="ok">' + I('check', 12) + '</span></div>'; }, 1100);
      var t3 = setTimeout(function () { logs.innerHTML += '<div>' + T('已同步到个人主页') + '</div>'; }, 1500);
      timers.push(t1, t2, t3);
      var tick = setInterval(function () {
        var v = Math.min(100, parseInt(prog.querySelector('.p-fill').style.width || '0', 10) + 7);
        prog.querySelector('.p-fill').style.width = v + '%';
        if (v >= 100) clearInterval(tick);
      }, 80);
      timers.push(tick);
      var done = setTimeout(function () {
        var now = Date.now();
        data.node = {
          connected: true, name: cfg.name, ip: cfg.ip, port: cfg.port,
          runtime: DISCOVERY.runtime, os: DISCOVERY.os,
          visibility: cfg.visibility, agents: enabledAgents.map(function (a) { return a.id; }), published: now
        };
        D.set();
        UI.toast({ type: 'success', title: T('节点已发布'), desc: T('{a} 已上架 {n} 个 Agent', { a: cfg.name, n: enabledAgents.length }) });
        R.nav('/');
      }, 2100);
      timers.push(done);
    } else {
      var summary = document.createElement('div');
      summary.style.cssText = 'font-size:12.5px; color:var(--text-faint); text-align:center;';
      summary.innerHTML = T('发布后将出现在个人主页「在线节点」，并同步到 {p}。', { p: '<b style="color:var(--brand)">' + (cfg.visibility === 'public' ? T('Agent 市场') : T('企业内网')) + '</b>' });
      wrap.appendChild(summary);
    }
    return wrap;
  }

  function foot(btns) {
    var f = document.createElement('div');
    f.style.cssText = 'display:flex; justify-content:space-between; gap:10px; margin-top:20px;';
    f.appendChild(btns[0]);
    f.appendChild(btns[1]);
    return f;
  }
  function go(n) { state.step = n; render(); }

  function publish() {
    state.publishing = true;
    render();
  }

  render();
  return root;
};