/* ==========================================================================
   router.js — Hash 路由 + 登录守卫 + 标题
   ========================================================================== */
window.ResolveRouter = (function () {
  'use strict';
  var routes = {};
  var guard = null;   /* function(path) -> true 放行 / false 拦截 */
  var current = null;
  var T = function (k) { return window.ResolveI18N ? window.ResolveI18N.T(k) : k; };

  function register(path, def) { routes[path] = def; }
  function nav(path) {
    if (parse() === path) { run(); return; }
    if (location.hash === '#' + path) return;
    location.hash = '#' + path;
  }
  function parse() {
    var h = location.hash || '#/';
    if (h === '#' || h === '') h = '#/';
    var q = h.indexOf('?');
    return (q > 0 ? h.slice(1, q) : h.slice(1));
  }
  function run() {
    var path = parse();
    if (guard && !guard(path)) { return; }
    var def = routes[path] || routes['/'];
    if (!def) { nav('/'); return; }
    current = def;
    document.title = def.title ? T(def.title) + ' · Resolve' : T('Resolve · 控制台');
    def.render(path);
    var view = document.getElementById('view');
    if (view) view.scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function setGuard(fn) { guard = fn; }

  window.addEventListener('hashchange', run);

  return { register: register, nav: nav, parse: parse, run: run, setGuard: setGuard, getCurrent: function () { return current; } };
})();