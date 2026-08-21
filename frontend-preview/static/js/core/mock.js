/* ==========================================================================
   mock.js — Mock 数据源 + 本地持久化 Store + 会话（GitHub OAuth / 邮箱，均 mock）
   ========================================================================== */
window.ResolveData = (function () {
  'use strict';

  var KEY = 'resolve.console.v1';

  /* ---------- 工具 ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtMoney(n) {
    var neg = n < 0;
    var v = Math.abs(n);
    var s = v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  }
  function money(n) { return '¥' + fmtMoney(n); }
  function fmtNum(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtDate(ts, withTime) {
    var d = new Date(ts);
    var s = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    if (withTime) s += ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    return s;
  }
  function fmtTime(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function timeAgo(ts) {
    var diff = (Date.now() - ts) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' 天前';
    return fmtDate(ts);
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  /* 名称 → 确定性头像色（语雀风格柔和色板） */
  var AVATAR_COLORS = ['#1a73e8', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
  function colorOf(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
  function initialsOf(name) {
    var parts = String(name).trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
  }
  /* hex → rgba 字符串（用于品牌色浅底） */
  function hexA(hex, a) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  /* 确定性 identicon：5×5 网格 SVG data-URI */
  function identicon(name, size) {
    size = size || 80;
    var h = 0, i;
    for (i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
    var rnd = mulberry32(h);
    var base = colorOf(name);
    var cells = [];
    for (i = 0; i < 25; i++) {
      if (rnd() > 0.62) continue;
      var r = i % 5, c = (i / 5) | 0;
      if (r > 2) r = 4 - r; /* 对称 */
      if (r < 0) r = 0;
      cells.push('M' + (r * 20 + 2) + ' ' + (c * 20 + 2) + 'h16v16H' + (r * 20 + 2) + 'z');
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" rx="22" fill="' + base + '"/>' +
      '<g fill="#fff" opacity="0.92">' + cells.join('') + '</g></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- 热力图数据（53×7，确定性生成） ---------- */
  function genHeatmap() {
    var now = new Date();
    var days = 371;
    var out = [];
    var rnd = mulberry32(now.getFullYear() * 7919 + 13);
    var start = new Date(now.getTime() - (days - 1) * 86400000);
    var streak = 0;
    for (var i = 0; i < days; i++) {
      var base = 4 + rnd() * 12;
      var dow = (start.getDay() + i) % 7;
      var weekend = (dow === 0 || dow === 6) ? 0.5 : 1;
      if (rnd() < 0.18) streak = 6 + rnd() * 14;
      else streak = Math.max(0, streak - 1 - rnd() * 3);
      var v = Math.max(0, Math.round(base * weekend + streak * 0.55 + (rnd() - 0.5) * 5));
      out.push(Math.min(30, Math.round(v)));
    }
    return out;
  }

  /* ---------- 默认数据 ---------- */
  function defaults() {
    var d = Date.now(), H = 3600000;
    return {
      session: null,
      profile: {
        name: '陈默',
        github: 'chenmo-dev',
        job: '全栈工程师 · 独立 Agent 开发者',
        os: { id: 'macos', label: 'macOS 15.1' },
        bio: '把本机 Agent 挂到 Resolve，让闲置算力变成可调用的服务。',
        joined: '2025-06-14'
      },
      agents: [
        { id: 'codex', name: 'Codex', product: 'OpenAI Codex', icon: 'codex', status: 'online', accent: '#0D1117',
          models: ['gpt-5.2-codex', 'o4-mini'], price: '¥0.06', unit: '/千token', tags: ['代码生成', '重构', '审查'], desc: '读写仓库上下文的代码代理，擅长多文件改动与测试修复。' },
        { id: 'claudecode', name: 'Claude Code', product: 'Anthropic Claude Code', icon: 'claude', status: 'online', accent: '#D97757',
          models: ['claude-opus-4.5', 'claude-sonnet-4.5'], price: '¥0.09', unit: '/千token', tags: ['终端开发', '长任务'], desc: '面向复杂工程任务的终端编码代理，支持长期规划与多步执行。' },
        { id: 'openclaw', name: 'OpenClaw', product: 'OpenClaw Local', icon: 'openclaw', status: 'online', accent: '#D64045',
          models: ['local-llama-3.3-70b', 'qwen3-coder-30b'], price: '¥0.03', unit: '/千token', tags: ['本地算力', '私有数据'], desc: '完全本地运行的长时任务代理，数据不出本机，适合敏感场景。' },
        { id: 'hermes', name: 'Hermes', product: 'Hermes Reasoning', icon: 'hermes', status: 'standby', accent: '#2d6376',
          models: ['hermes-4-405b', 'deepseek-r1'], price: '¥0.05', unit: '/千token', tags: ['深度推理', '分析'], desc: '高强度推理与结构化分析代理，数学、逻辑、研究场景首选。' }
      ],
      node: { connected: false, name: '', ip: '', port: '', runtime: '', os: '', visibility: 'public', agents: [], published: false },
      wallet: { balance: 286.4, monthCost: 118.6 },
      billing: [
        { id: 'b1', time: d - 0.6 * H, type: 'call', agent: 'Claude Code', amount: -21.3, status: 'done', method: '余额' },
        { id: 'b2', time: d - 3 * H, type: 'recharge', agent: '微信支付', amount: 100, status: 'done', method: '微信' },
        { id: 'b3', time: d - 26 * H, type: 'call', agent: 'Hermes', amount: -8.4, status: 'done', method: '余额' },
        { id: 'b4', time: d - 30 * H, type: 'call', agent: 'Codex', amount: -12.6, status: 'done', method: '余额' },
        { id: 'b5', time: d - 50 * H, type: 'withdraw', agent: '提现到银行卡', amount: -50, status: 'done', method: '银行卡' },
        { id: 'b6', time: d - 72 * H, type: 'recharge', agent: '支付宝', amount: 50, status: 'done', method: '支付宝' }
      ],
      marketplace: [
        { id: 'm1', cat: 'code', name: 'Codex 代码代理', vendor: '陈默', vendorGithub: 'chenmo-dev', icon: 'codex', accent: '#0D1117', online: true, rating: 4.9, orders: 1284, price: '¥0.06/千token', priceNum: 0.06,
          tags: ['代码生成', '全栈'], models: ['gpt-5.2-codex', 'o4-mini'], desc: '读写仓库上下文，完成多文件重构、测试修复与代码审查，支持常见语言与框架。', sla: '平均响应 40s · 成功率 99.2%', featured: true },
        { id: 'm2', cat: 'code', name: 'Claude Code 终端开发', vendor: '林一', vendorGithub: 'lin-yi', icon: 'claude', accent: '#D97757', online: true, rating: 4.8, orders: 968, price: '¥0.09/千token', priceNum: 0.09,
          tags: ['复杂工程', '长任务'], models: ['claude-opus-4.5', 'claude-sonnet-4.5'], desc: '复杂工程任务的终端代理，能规划多步执行、维护长期上下文并产出可落地的改动。', sla: '平均响应 1.2min · 成功率 98.6%', featured: true },
        { id: 'm3', cat: 'reason', name: 'Hermes 深度推理', vendor: '王启明', vendorGithub: 'wang-qiming', icon: 'hermes', accent: '#2d6376', online: true, rating: 4.9, orders: 741, price: '¥0.05/千token', priceNum: 0.05,
          tags: ['推理', '分析'], models: ['hermes-4-405b', 'deepseek-r1'], desc: '数学、逻辑与结构化研究任务的高强度推理代理，输出带完整推导过程。', sla: '平均响应 3min · 成功率 97.4%' },
        { id: 'm4', cat: 'ops', name: 'OpenClaw 本地算力', vendor: '陈默', vendorGithub: 'chenmo-dev', icon: 'openclaw', accent: '#D64045', online: true, rating: 4.7, orders: 388, price: '¥0.03/千token', priceNum: 0.03,
          tags: ['本地算力', '隐私'], models: ['local-llama-3.3-70b', 'qwen3-coder-30b'], desc: '数据不出本机的工作代理，适合处理敏感代码与内部文档，按真实算力成本计价。', sla: '平均响应 2min · 成功率 96.1%' },
        { id: 'm5', cat: 'content', name: '论文精读 Agent', vendor: '苏雨桐', vendorGithub: 'su-yutong', icon: 'book', accent: '#0EA5E9', online: true, rating: 4.8, orders: 620, price: '¥0.04/千token', priceNum: 0.04,
          tags: ['论文', '综述'], models: ['claude-sonnet-4.5', 'gpt-5.2'], desc: '结构化精读 arXiv 论文：方法、实验、结论与局限，输出可直接引用的中文综述。', sla: '平均响应 5min · 成功率 98.0%' },
        { id: 'm6', cat: 'data', name: '数据分析 Agent', vendor: '李四', vendorGithub: 'lisi-lab', icon: 'trending-up', accent: '#10B981', online: true, rating: 4.6, orders: 512, price: '¥0.05/千token', priceNum: 0.05,
          tags: ['CSV', '可视化'], models: ['gemini-2.5-pro', 'claude-sonnet-4.5'], desc: '连接数据源自动清洗、统计与可视化，输出带图表的中文分析报告。', sla: '平均响应 4min · 成功率 97.8%' },
        { id: 'm7', cat: 'content', name: '翻译与本地化 Agent', vendor: '赵六', vendorGithub: 'zhao-liu', icon: 'globe', accent: '#F59E0B', online: true, rating: 4.7, orders: 1530, price: '¥0.02/千token', priceNum: 0.02,
          tags: ['翻译', '本地化'], models: ['gpt-5.2', 'gemini-2.5-pro'], desc: '中英日多语种翻译与产品本地化，术语表与风格指南可配置。', sla: '平均响应 30s · 成功率 99.5%', featured: true },
        { id: 'm8', cat: 'design', name: '图标设计 Agent', vendor: '王五', vendorGithub: 'wang-wu', icon: 'spark', accent: '#E11D48', online: false, rating: 4.5, orders: 267, price: '¥120/h', priceNum: 120,
          tags: ['SVG', '设计'], models: ['flux-pro', 'midjourney-v7'], desc: '生成线性图标、品牌标记与产品插画，输出可直接使用的 SVG 与说明。', sla: '平均响应 8min · 成功率 95.2%' },
        { id: 'm9', cat: 'code', name: '测试用例生成', vendor: '陈默', vendorGithub: 'chenmo-dev', icon: 'clipboard', accent: '#7C3AED', online: false, rating: 4.6, orders: 402, price: '¥0.04/千token', priceNum: 0.04,
          tags: ['单测', '回归'], models: ['gpt-5.2-codex', 'claude-opus-4.5'], desc: '按函数签名与边界条件自动生成单元测试与回归用例，覆盖分支与异常路径。', sla: '平均响应 1min · 成功率 98.3%' },
        { id: 'm10', cat: 'content', name: 'PRD 生成 Agent', vendor: '赵六', vendorGithub: 'zhao-liu', icon: 'folder', accent: '#06B6D4', online: true, rating: 4.8, orders: 355, price: '¥0.03/千token', priceNum: 0.03,
          tags: ['产品', '文档'], models: ['claude-sonnet-4.5'], desc: '把口述需求整理成结构化 PRD、用户故事与验收标准，含竞品与风险章节。', sla: '平均响应 3min · 成功率 97.9%' }
      ],
      enterprise: {
        name: '远景科技',
        seats: 6,
        members: [
          { id: 'e1', name: '张三', job: '后端工程师', os: { id: 'windows', label: 'Windows 11' }, role: '管理员', online: true, avatar: '#1a73e8',
            agents: ['Codex', 'OpenClaw'], models: ['gpt-5.2-codex', 'qwen3-coder-30b'] },
          { id: 'e2', name: '李四', job: '算法工程师', os: { id: 'macos', label: 'macOS 14.5' }, role: '成员', online: true, avatar: '#7C3AED',
            agents: ['Hermes', 'Claude Code'], models: ['hermes-4-405b', 'claude-sonnet-4.5'] },
          { id: 'e3', name: '王五', job: '前端工程师', os: { id: 'macos', label: 'macOS 14.4' }, role: '成员', online: true, avatar: '#F59E0B',
            agents: ['Claude Code', 'Codex'], models: ['claude-sonnet-4.5', 'gpt-5.2-codex'] },
          { id: 'e4', name: '赵六', job: '产品经理', os: { id: 'windows', label: 'Windows 11' }, role: '成员', online: true, avatar: '#10B981',
            agents: ['PRD 生成', '翻译'], models: ['claude-sonnet-4.5'] },
          { id: 'e5', name: '孙七', job: '研究生', os: { id: 'linux', label: 'Linux Ubuntu 24.04' }, role: '成员', online: false, avatar: '#06B6D4',
            agents: ['论文精读', 'Hermes'], models: ['deepseek-r1', 'qwen3-coder-30b'] },
          { id: 'e6', name: '周八', job: '运维工程师', os: { id: 'linux', label: 'Linux Debian 12' }, role: '成员', online: false, avatar: '#0EA5E9',
            agents: ['OpenClaw'], models: ['local-llama-3.3-70b'] }
        ],
        resources: [
          { name: '张三', cpu: 42, mem: 38, uptime: '12d' },
          { name: '李四', cpu: 71, mem: 64, uptime: '8d' },
          { name: '王五', cpu: 33, mem: 47, uptime: '21d' },
          { name: '赵六', cpu: 18, mem: 29, uptime: '6d' },
          { name: '孙七', cpu: 5, mem: 12, uptime: 'offline' },
          { name: '周八', cpu: 58, mem: 51, uptime: '15d' }
        ],
        usage: { monthCalls: 462, monthTokens: '18.6M', monthFee: 1280 },
        logs: [
          { time: d - 12 * 60000, who: '张三', action: '调用李四的数据分析 Agent', result: '成功 · ¥3.20', type: 'call' },
          { time: d - 1.2 * H, who: '管理员', action: '将孙七设置为「只读」权限', result: '成功', type: 'perm' },
          { time: d - 2.4 * H, who: '王五', action: '调用赵六的翻译 Agent', result: '成功 · ¥1.10', type: 'call' },
          { time: d - 5 * H, who: '李四', action: '调用张三的 Codex 代理', result: '成功 · ¥4.60', type: 'call' },
          { time: d - 26 * H, who: '张三', action: '接入新节点 192.168.1.24:41521', result: '成功', type: 'node' },
          { time: d - 30 * H, who: '管理员', action: '导出审计日志 audit-2026-07.csv', result: '成功', type: 'audit' },
          { time: d - 52 * H, who: '赵六', action: '重置王五的调用密钥', result: '成功', type: 'perm' }
        ],
        settings: {
          allowMutualCall: true, allowGuestView: false, enforceLocalOnly: true,
          costModel: '免费 · 积分制', autoApprove: false
        }
      }
    };
  }

  /* ---------- Store ---------- */
  var _data = null;
  var _listeners = [];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var def = defaults();
        /* 顶层浅合并（新增字段自然回退到默认） */
        for (var k in def) { if (saved[k] === undefined) saved[k] = def[k]; }
        return saved;
      }
    } catch (e) { /* ignore */ }
    return defaults();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(_data)); } catch (e) { /* ignore */ }
  }
  function get() { if (!_data) _data = load(); return _data; }
  function set() { save(); _listeners.forEach(function (fn) { fn(_data); }); }
  function on(fn) { _listeners.push(fn); }

  function resetAll() {
    _data = defaults();
    save();
  }

  /* ---------- 会话 ---------- */
  function isAuthed() { return !!get().session; }
  function login(provider, user) {
    _data.session = { provider: provider, user: user, at: Date.now() };
    set();
  }
  function logout() {
    _data.session = null;
    set();
  }
  function me() {
    var s = _data.session;
    if (!s) return null;
    var p = _data.profile;
    return {
      name: s.user.name || p.name,
      provider: s.provider,
      github: s.user.github || p.github,
      email: s.user.email || '',
      color: s.user.color || colorOf(s.user.name || p.name)
    };
  }

  /* ---------- 钱包 ---------- */
  function bumpWallet(amount) {
    _data.wallet.balance = Math.round((_data.wallet.balance + amount) * 100) / 100;
  }
  function addBilling(rec) {
    _data.billing.unshift({ id: 'b' + Date.now() + Math.floor(Math.random() * 999), time: Date.now(), status: 'done', ...rec });
    set();
  }
  function recharge(amount, method) {
    addBilling({ type: 'recharge', agent: method === '微信' ? '微信支付' : '支付宝', amount: amount, method: method });
    bumpWallet(amount);
    set();
  }
  function spend(amount, agent) {
    addBilling({ type: 'call', agent: agent, amount: -(Math.round(amount * 100) / 100), method: '余额' });
    bumpWallet(-amount);
    _data.wallet.monthCost = Math.round((_data.wallet.monthCost + amount) * 100) / 100;
    set();
  }

  /* ---------- 聚合 ---------- */
  function heatmap() { return genHeatmap(); }
  function stats() {
    var hm = genHeatmap();
    var total = 0, i;
    for (i = 0; i < hm.length; i++) total += hm[i];
    return {
      today: hm[hm.length - 1],
      week: hm[hm.length - 7] + hm[hm.length - 6] + hm[hm.length - 5] + hm[hm.length - 4] + hm[hm.length - 3] + hm[hm.length - 2] + hm[hm.length - 1],
      total: total,
      monthVolume: 218 + (hm[hm.length - 1] % 17),
      revenue: 1264.5,
      onlineHours: 132.5,
      successRate: 99.2
    };
  }

  return {
    get: get, save: save, set: set, on: on, resetAll: resetAll,
    isAuthed: isAuthed, login: login, logout: logout, me: me,
    heatmap: heatmap, stats: stats,
    recharge: recharge, spend: spend, addBilling: addBilling,
    fmtMoney: fmtMoney, money: money, fmtNum: fmtNum, fmtDate: fmtDate, fmtTime: fmtTime, timeAgo: timeAgo,
    colorOf: colorOf, initialsOf: initialsOf, identicon: identicon, hexA: hexA, esc: esc
  };
})();
