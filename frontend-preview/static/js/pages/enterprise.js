/* ==========================================================================
   pages/enterprise.js — 企业版：局域网成员目录 / 互相查看与调用 / 管理员管控
   ========================================================================== */
window.ResolvePages = window.ResolvePages || {};
window.ResolvePages.enterprise = function () {
  'use strict';
  var D = window.ResolveData, UI = window.ResolveUI, R = window.ResolveRouter;
  var I = UI.I, esc = D.esc;

  var data = D.get();
  var ent = data.enterprise;
  var root = document.createElement('div');
  root.className = 'page';
  var adminTab = 'members';

  var head = document.createElement('div');
  head.className = 'page-head';
  head.innerHTML = '<div><h1 class="page-title">企业版</h1>' +
    '<p class="page-sub">局域网私有部署，员工互相查看与调用本地 Agent，数据不出内网。管理员统一管控。</p></div>';
  var headBtns = document.createElement('div');
  headBtns.appendChild(UI.btn({ label: '邀请成员', icon: 'plus', variant: 'primary', onClick: function () {
    UI.toast({ type: 'success', title: '邀请链接已生成', desc: '有效期 24 小时 · resolve.app/e/join/9x2k' });
  } }));
  head.appendChild(headBtns);
  root.appendChild(head);

  /* ---------- 企业头卡 ---------- */
  var entCard = document.createElement('div');
  entCard.className = 'card';
  entCard.innerHTML = '<div class="card-body"><div class="ent-head"></div></div>';
  var entInner = entCard.querySelector('.ent-head');
  var logo = document.createElement('span');
  logo.className = 'ent-logo';
  logo.textContent = '远';
  var info = document.createElement('div');
  var nm = document.createElement('div');
  nm.className = 'ent-name';
  nm.appendChild(document.createTextNode(ent.name));
  nm.appendChild(UI.tag({ text: '已认证企业', variant: 'brand', dot: true }));
  nm.appendChild(UI.statusDot('online', ent.members.filter(function (m) { return m.online; }).length + '/' + ent.members.length + ' 在线'));
  var sub = document.createElement('div');
  sub.className = 'ent-sub';
  sub.textContent = ent.seats + ' 席位 · 局域网私有部署 · 数据不出内网';
  info.appendChild(nm); info.appendChild(sub);
  var entActions = document.createElement('div');
  entActions.className = 'ent-actions';
  entActions.appendChild(UI.btn({ label: '企业设置', icon: 'settings', onClick: function () { UI.toast({ type: 'info', title: '企业设置（模拟）', desc: '席位、域名与结算策略在此管理' }); } }));
  entInner.appendChild(logo); entInner.appendChild(info); entInner.appendChild(entActions);
  root.appendChild(entCard);

  /* ---------- 指标 ---------- */
  var stats = document.createElement('div');
  stats.className = 'grid grid-4';
  stats.style.cssText = 'margin-top:16px;';
  stats.appendChild(UI.stat({ icon: 'zap', label: '本月调用', value: ent.usage.monthCalls + ' 次', accent: true }));
  stats.appendChild(UI.stat({ icon: 'database', label: '本月 Token', value: ent.usage.monthTokens }));
  stats.appendChild(UI.stat({ icon: 'coins', label: '本月费用', value: D.money(ent.usage.monthFee) }));
  stats.appendChild(UI.stat({ icon: 'wifi', label: '在线席位', value: ent.members.filter(function (m) { return m.online; }).length + ' / ' + ent.members.length }));
  root.appendChild(stats);

  /* ---------- 成员目录 ---------- */
  var memberCard = document.createElement('div');
  memberCard.className = 'card';
  memberCard.style.cssText = 'margin-top:16px;';
  memberCard.innerHTML = '<div class="card-head"><div><div class="card-title">' + I('users', 15) + '成员目录</div>' +
    '<div class="card-sub">内网成员可见 · 可互相查看与调用对方 Agent</div></div></div>';
  var mbody = document.createElement('div');
  mbody.className = 'card-body';
  var mgrid = document.createElement('div');
  mgrid.className = 'member-grid';
  ent.members.forEach(function (m) { mgrid.appendChild(memberCardEl(m)); });
  mbody.appendChild(mgrid);
  memberCard.appendChild(mbody);
  root.appendChild(memberCard);

  /* ---------- 管理员面板 ---------- */
  var adminCard = document.createElement('div');
  adminCard.className = 'card';
  adminCard.style.cssText = 'margin-top:16px;';
  adminCard.innerHTML = '<div class="card-head"><div><div class="card-title">' + I('shield', 15) + '企业管理</div>' +
    '<div class="card-sub">成员 / 权限 / 资源 / 计费 / 审计 五项管控</div></div>' +
    '<span class="tag warn">管理员</span></div>';
  var atabsWrap = document.createElement('div');
  atabsWrap.className = 'admin-tabs-wrap';
  atabsWrap.style.cssText = 'padding: 12px 20px 0;';
  atabsWrap.appendChild(UI.tabs({
    items: [
      { value: 'members', label: '成员管理' }, { value: 'perms', label: '权限管理' },
      { value: 'resources', label: '资源监控' }, { value: 'billing', label: '计费概览' }, { value: 'logs', label: '审计日志' }
    ],
    value: adminTab,
    onChange: function (v) { adminTab = v; renderAdmin(abody); }
  }));
  adminCard.appendChild(atabsWrap);
  var abody = document.createElement('div');
  abody.className = 'card-body';
  adminCard.appendChild(abody);
  renderAdmin(abody);
  root.appendChild(adminCard);

  /* ---------- 成员卡 ---------- */
  function memberCardEl(m) {
    var card = document.createElement('div');
    card.className = 'member-card';
    var top = document.createElement('div');
    top.className = 'member-top';
    top.appendChild(UI.avatar({ name: m.name, color: m.avatar, size: 42, status: m.online ? 'online' : 'offline' }));
    var info2 = document.createElement('div');
    info2.className = 'member-info';
    var nm2 = document.createElement('div');
    nm2.className = 'member-name';
    nm2.appendChild(document.createTextNode(m.name));
    nm2.appendChild(UI.tag({ text: m.role === '管理员' ? '管理员' : '成员', variant: m.role === '管理员' ? 'warn' : 'weak' }));
    var jb = document.createElement('div');
    jb.className = 'member-job';
    jb.textContent = m.job;
    info2.appendChild(nm2); info2.appendChild(jb);
    top.appendChild(info2);
    var meta = document.createElement('div');
    meta.className = 'member-meta';
    meta.appendChild(UI.osBadge(m.os));
    var agents = document.createElement('div');
    agents.className = 'member-agents';
    agents.innerHTML = I('cpu', 13);
    agents.appendChild(document.createTextNode(m.agents.join(' · ')));
    var actions = document.createElement('div');
    actions.className = 'member-actions';
    actions.appendChild(UI.btn({ label: '查看', icon: 'eye', size: 'sm', onClick: function () { memberDetail(m); } }));
    actions.appendChild(UI.btn({ label: '调用', icon: 'zap', variant: 'primary', size: 'sm', onClick: function () { callMember(m); } }));
    card.appendChild(top); card.appendChild(meta); card.appendChild(agents); card.appendChild(actions);
    return card;
  }

  /* ---------- 成员详情 ---------- */
  function memberDetail(m) {
    var body = document.createElement('div');
    body.style.cssText = 'display:flex; flex-direction:column; gap:14px;';
    var top = document.createElement('div');
    top.className = 'member-top';
    top.appendChild(UI.avatar({ name: m.name, color: m.avatar, size: 52, status: m.online ? 'online' : 'offline' }));
    var info2 = document.createElement('div');
    var nm2 = document.createElement('div');
    nm2.className = 'member-name';
    nm2.appendChild(document.createTextNode(m.name));
    nm2.appendChild(UI.tag({ text: m.role === '管理员' ? '管理员' : '成员', variant: m.role === '管理员' ? 'warn' : 'weak' }));
    var jb = document.createElement('div'); jb.className = 'member-job'; jb.textContent = m.job;
    info2.appendChild(nm2); info2.appendChild(jb);
    top.appendChild(info2);
    body.appendChild(top);
    var meta = document.createElement('div');
    meta.className = 'member-meta';
    meta.appendChild(UI.osBadge(m.os));
    body.appendChild(meta);
    var lines = document.createElement('div');
    var nodeIp = '192.168.1.' + (20 + (m.name.charCodeAt(0) % 20));
    lines.innerHTML =
      '<div class="quote-line"><span class="k">内网节点</span><span class="v mono">' + nodeIp + ':4152' + (m.id.charCodeAt(1) % 10) + '</span></div>' +
      '<div class="quote-line"><span class="k">可用 Agent</span><span class="v">' + esc(m.agents.join(' · ')) + '</span></div>' +
      '<div class="quote-line"><span class="k">模型矩阵</span><span class="v">' + esc(m.models.join(' · ')) + '</span></div>' +
      '<div class="quote-line"><span class="k">计费模式</span><span class="v">企业积分 · 内网免费</span></div>' +
      '<div class="quote-line"><span class="k">今日调用</span><span class="v">' + (2 + m.name.length * 3) + ' 次 · 成功率 99%</span></div>';
    body.appendChild(lines);
    var note = document.createElement('div');
    note.style.cssText = 'font-size:12px; color:var(--text-faint); display:flex; gap:6px; align-items:center;';
    note.innerHTML = I('lock', 12) + '数据通过企业内网直连，不经过公网转发。';
    body.appendChild(note);
    var mm = UI.modal({ title: m.name + ' · 成员档案', subtitle: m.job, body: body, footer: [] });
    var foot = mm.querySelector('.modal-foot');
    if (foot) {
      foot.appendChild(UI.btn({ label: '关闭', onClick: function () { mm.close(); } }));
      foot.appendChild(UI.btn({ label: '调用 ' + m.agents[0], icon: 'zap', variant: 'primary', onClick: function () { mm.close(); callMember(m); } }));
    }
  }

  /* ---------- 内网调用 ---------- */
  function callMember(m) {
    var selAgent = m.agents[0];
    var body = document.createElement('div');
    body.className = 'call-modal';
    body.innerHTML = '<div class="member-top"><span class="avatar" style="background:' + m.avatar + ';width:40px;height:40px;font-size:15px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;color:#fff;font-weight:600;">' + esc(m.name.slice(0, 1)) + '</span>' +
      '<div><div class="mk-name">' + esc(m.name) + '</div><div class="mk-vendor">' + esc(m.job) + ' · 内网直连</div></div></div>';
    var segWrap = document.createElement('div');
    segWrap.style.cssText = 'display:flex; flex-direction:column; gap:7px;';
    segWrap.innerHTML = '<label class="fl">选择要调用的 Agent</label>';
    var seg = UI.segmented({
      options: m.agents.map(function (a) { return { value: a, label: a }; }),
      value: selAgent,
      onChange: function (v) { selAgent = v; }
    });
    segWrap.appendChild(seg);
    body.appendChild(segWrap);
    var ta = document.createElement('textarea');
    ta.className = 'inp';
    ta.rows = 3;
    ta.placeholder = '描述内网协作任务…';
    ta.style.cssText = 'resize:vertical;';
    body.appendChild(ta);
    var lines = document.createElement('div');
    lines.innerHTML = '<div class="quote-line"><span class="k">计费</span><span class="v">企业积分 · 内网免费（模拟）</span></div>';
    body.appendChild(lines);

    var m2 = UI.modal({ title: '内网调用', subtitle: '跨节点调用对方本地 Agent', body: body, footer: [] });
    var foot = m2.querySelector('.modal-foot');
    if (foot) {
      foot.appendChild(UI.btn({ label: '取消', onClick: function () { m2.close(); } }));
      foot.appendChild(UI.btn({ label: '发起调用', icon: 'send', variant: 'primary', onClick: function (ev, btn) {
        btn.disabled = true; btn.textContent = '正在连接…';
        setTimeout(function () {
          m2.close();
          ent.usage.monthCalls++;
          ent.logs.unshift({ time: Date.now(), who: D.me().name, action: '调用' + m.name + ' 的 ' + selAgent, result: '成功 · 企业积分', type: 'call' });
          D.set();
          UI.toast({ type: 'success', title: '内网调用完成', desc: '已调用 ' + m.name + ' 的 ' + selAgent });
          R.run();
        }, 1100);
      } }));
    }
  }

  /* ---------- 管理员内容 ---------- */
  function renderAdmin(body) {
    body.innerHTML = '';
    if (adminTab === 'members') adminMembers(body);
    else if (adminTab === 'perms') adminPerms(body);
    else if (adminTab === 'resources') adminResources(body);
    else if (adminTab === 'billing') adminBilling(body);
    else adminLogs(body);
  }

  function adminMembers(body) {
    var wrap = document.createElement('div');
    ent.members.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'bill-row';
      row.appendChild(UI.avatar({ name: m.name, color: m.avatar, size: 34, status: m.online ? 'online' : 'offline' }));
      var main = document.createElement('div');
      main.className = 'bill-main';
      var nm = document.createElement('div');
      nm.className = 'bill-name';
      nm.textContent = m.name;
      var jb = document.createElement('div');
      jb.className = 'bill-time';
      jb.textContent = m.job + ' · ' + m.os.label;
      main.appendChild(nm); main.appendChild(jb);
      var sel = document.createElement('select');
      sel.className = 'inp';
      sel.style.cssText = 'width:auto; padding:7px 30px 7px 12px;';
      ['成员', '管理员'].forEach(function (r) {
        var o = document.createElement('option');
        o.value = r; o.textContent = r;
        if (r === m.role) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        m.role = sel.value;
        D.set();
        UI.toast({ type: 'success', title: '角色已更新', desc: m.name + ' → ' + sel.value });
      });
      var rmBtn = UI.btn({ label: '移除', icon: 'trash', variant: 'ghost', size: 'sm', onClick: function () {
        UI.toast({ type: 'info', title: '已移除（模拟）', desc: m.name + ' 已移出企业' });
      } });
      row.appendChild(main);
      var right = document.createElement('div');
      right.style.cssText = 'display:flex; gap:8px; align-items:center;';
      right.appendChild(sel); right.appendChild(rmBtn);
      row.appendChild(right);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  function adminPerms(body) {
    var s = ent.settings;
    var perms = [
      { key: 'allowMutualCall', name: '允许成员互相调用', desc: '成员可在内网直接调用对方的 Agent 与模型' },
      { key: 'allowGuestView', name: '允许访客查看成员目录', desc: '未登录访客可在企业落地页查看公开成员信息' },
      { key: 'enforceLocalOnly', name: '强制内网直连', desc: '禁止通过公网转发，数据始终留在局域网' },
      { key: 'autoApprove', name: '新成员自动通过', desc: '关闭时新成员需管理员手动审批（默认关闭）' }
    ];
    var wrap = document.createElement('div');
    perms.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'perm-row';
      var main = document.createElement('div');
      main.className = 'perm-main';
      var nm = document.createElement('div');
      nm.className = 'perm-name';
      nm.textContent = p.name;
      var ds = document.createElement('div');
      ds.className = 'perm-desc';
      ds.textContent = p.desc;
      main.appendChild(nm); main.appendChild(ds);
      var sw = UI.switch({ checked: !!s[p.key], onChange: function (v) {
        s[p.key] = v;
        D.set();
        UI.toast({ type: 'success', title: v ? '已开启' : '已关闭', desc: p.name });
      } });
      row.appendChild(main); row.appendChild(sw);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  function adminResources(body) {
    var wrap = document.createElement('div');
    ent.resources.forEach(function (r) {
      var row = document.createElement('div');
      row.className = 'mon-row';
      var nm = document.createElement('div');
      nm.className = 'mon-name';
      nm.textContent = r.name;
      var bar = document.createElement('div');
      bar.className = 'mon-bar';
      bar.appendChild(UI.progress({ value: r.cpu, color: r.cpu > 70 ? 'var(--c-warn)' : 'var(--brand)' }));
      var num = document.createElement('span');
      num.className = 'mon-num';
      num.textContent = r.cpu + '%';
      var bar2 = document.createElement('div');
      bar2.className = 'mon-bar';
      bar2.appendChild(UI.progress({ value: r.mem, color: 'var(--ok)' }));
      var num2 = document.createElement('span');
      num2.className = 'mon-num';
      num2.textContent = r.mem + '%';
      var up = document.createElement('span');
      up.className = 'mon-uptime';
      up.textContent = r.uptime === 'offline' ? '离线' : '在线 ' + r.uptime;
      row.appendChild(nm); row.appendChild(bar); row.appendChild(num); row.appendChild(bar2); row.appendChild(num2); row.appendChild(up);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  function adminBilling(body) {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="quote-line"><span class="k">计费模式</span><span class="v">免费 · 积分制（内网）</span></div>' +
      '<div class="quote-line"><span class="k">本月调用次数</span><span class="v">' + ent.usage.monthCalls + ' 次</span></div>' +
      '<div class="quote-line"><span class="k">本月 Token</span><span class="v">' + ent.usage.monthTokens + '</span></div>' +
      '<div class="quote-line"><span class="k">本月费用</span><span class="v">' + D.money(ent.usage.monthFee) + '</span></div>' +
      '<div class="quote-line"><span class="k">平台服务费</span><span class="v">0%（企业版）</span></div>';
    var quota = document.createElement('div');
    quota.style.cssText = 'margin-top:14px; display:flex; flex-direction:column; gap:7px;';
    quota.innerHTML = '<div style="display:flex; justify-content:space-between; font-size:12.5px;"><span class="k" style="color:var(--text-mid);">本月企业额度</span><span style="color:var(--text-strong); font-weight:600;">' + D.money(ent.usage.monthFee) + ' / ' + D.money(2000) + '</span></div>';
    quota.appendChild(UI.progress({ value: Math.round(ent.usage.monthFee / 2000 * 100) }));
    wrap.appendChild(quota);
    body.appendChild(wrap);
  }

  function adminLogs(body) {
    var wrap = document.createElement('div');
    ent.logs.slice(0, 8).forEach(function (l) {
      var row = document.createElement('div');
      row.className = 'log-line';
      var tm = document.createElement('span');
      tm.className = 'log-time';
      tm.textContent = D.fmtDate(l.time, true);
      var who = document.createElement('span');
      who.className = 'log-who';
      who.textContent = l.who;
      var act = document.createElement('span');
      act.className = 'log-action';
      act.textContent = l.action;
      var res = document.createElement('span');
      res.className = 'log-result' + (l.result.indexOf('成功') > -1 ? ' ok' : '');
      res.textContent = l.result;
      row.appendChild(tm); row.appendChild(who); row.appendChild(act); row.appendChild(res);
      wrap.appendChild(row);
    });
    body.appendChild(wrap);
  }

  return root;
};