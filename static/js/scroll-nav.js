/* ==========================================================================
   academic-project-page-ui — scroll-nav.js
   双导航系统：顶部导航（滚动出现）+ 侧边章节进度导航（滚动高亮）
   从 LLM-as-a-Verifier 项目页提取并修复：
     - 移除 nerfies 模板残留（interpolation 预加载 240 张图片的 bug）
     - 移除 jQuery 依赖（原生 API 实现）
   ========================================================================== */
(function () {
  'use strict';

  var TRIGGER_Y = 120;      // 顶部导航出现阈值（px）
  var SIDE_SHOW_Y = 140;    // 章节判定阈值（px）

  /** 收集 [id, element] 章节（按 DOM 顺序），需与 side-nav 中 data-target 对应 */
  function collectSections(ids) {
    var out = [];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) out.push({ id: id, el: el });
    });
    return out;
  }

  /** 建立 data-target -> <a> 的映射 */
  function collectLinks(root) {
    var links = {};
    if (!root) return links;
    root.querySelectorAll('a[data-target]').forEach(function (a) {
      links[a.getAttribute('data-target')] = a;
    });
    return links;
  }

  function init(opts) {
    var cfg = opts || {};
    var sectionIds = cfg.sectionIds || [];
    var sideNav = document.querySelector(cfg.sideNav || '.side-nav');
    var topNav = document.getElementById(cfg.topNavId || 'topNav');
    var trigEl = cfg.triggerEl ? document.getElementById(cfg.triggerEl) : null;

    var S = collectSections(sectionIds);
    var links = collectLinks(sideNav);

    function onScroll() {
      // 1) 顶部导航：滚动超过阈值出现
      if (topNav) topNav.classList.toggle('visible', window.scrollY > TRIGGER_Y);

      // 2) 侧边导航：滚动到触发器章节后出现（未指定触发器则 400px）
      if (sideNav) {
        var show = trigEl ? (trigEl.getBoundingClientRect().top <= 100) : (window.scrollY > 400);
        sideNav.classList.toggle('visible', show);
      }

      // 3) 章节高亮：取视口内最靠上且已越过阈值的章节
      var best = null, bestTop = -Infinity;
      S.forEach(function (o) {
        var t = o.el.getBoundingClientRect().top;
        if (t - SIDE_SHOW_Y <= 0 && t > bestTop) { bestTop = t; best = o; }
      });
      if (!best && S.length) best = S[0];

      Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
      if (best && links[best.id]) links[best.id].classList.add('active');
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (document.readyState !== 'loading') onScroll();
    else document.addEventListener('DOMContentLoaded', onScroll);
  }

  /* 默认配置：8 个典型章节 + 通用选择器（页面可覆盖） */
  var DEFAULT_IDS = [
    'overview', 'results', 'api', 'motivation',
    'methodology', 'analysis', 'experiments', 'appendix'
  ];

  if (window.ProjectPageNav) return; // 防重复初始化
  window.ProjectPageNav = { init: init, defaults: DEFAULT_IDS };

  // 自动初始化（若存在 side-nav 标记）
  document.addEventListener('DOMContentLoaded', function () {
    if (document.querySelector('.side-nav')) {
      init({ sectionIds: DEFAULT_IDS, sideNav: '.side-nav', topNavId: 'topNav', triggerEl: 'results' });
    }
  });
})();
