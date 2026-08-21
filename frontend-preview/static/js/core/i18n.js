/* ==========================================================================
   i18n.js — 语言机制（纯 JS，零依赖）
   zh 为源语言：key 即中文文案；en 模式查 window.ResolveI18N_EN 词典，
   未收录的 key 回退为中文原文。T(key, params) 支持 {name} 插值。
   语言偏好持久化在 localStorage['resolve.locale']（与 Vue 控制台一致）。
   ========================================================================== */
window.ResolveI18N = (function () {
  'use strict';

  var KEY = 'resolve.locale';
  var locale = (function () {
    try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'zh'; } catch (e) { return 'zh'; }
  })();
  var listeners = [];

  function T(key, params) {
    var s;
    if (locale === 'en') {
      var dict = window.ResolveI18N_EN || {};
      s = dict[key];
    }
    if (s === undefined || s === null) s = key;
    if (params) {
      var keys = Object.keys(params);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        s = s.split('{' + k + '}').join(String(params[k]));
      }
    }
    return s;
  }

  /* 外壳重写：所有 [data-i18n] 元素 + 交给 App 的 applyLocale 钩子（标题 / 用户区 / 当前视图） */
  function applyShell() {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) els[i].textContent = T(els[i].getAttribute('data-i18n'));
    if (window.ResolveApp && typeof window.ResolveApp.applyLocale === 'function') window.ResolveApp.applyLocale();
  }

  function set(l) {
    if (l !== 'zh' && l !== 'en') l = 'zh';
    locale = l;
    try { localStorage.setItem(KEY, l); } catch (e) { /* ignore */ }
    applyShell();
    for (var i = 0; i < listeners.length; i++) listeners[i](l);
  }

  function toggle() { set(locale === 'zh' ? 'en' : 'zh'); }

  function addListener(fn) { listeners.push(fn); }

  function getLocale() { return locale; }
  function isEn() { return locale === 'en'; }

  /* 启动时应用语言（等所有脚本加载完成，App 钩子可用） */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyShell);
  } else {
    setTimeout(applyShell, 0);
  }

  return { T: T, set: set, toggle: toggle, onChange: addListener, get: getLocale, isEn: isEn };
})();

window.T = window.ResolveI18N.T;