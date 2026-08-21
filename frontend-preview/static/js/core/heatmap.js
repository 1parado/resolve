/* ==========================================================================
   heatmap.js — 纯 SVG 成交量热力图（GitHub 风格 · 53 列 × 7 行）
   ========================================================================== */
window.ResolveHeatmap = (function () {
  'use strict';
  var ROWS = 7, COLS = 53;
  var CELL = 11, GAP = 3, PAD = 12;
  var TOTAL = CELL + GAP;

  function level(v) {
    if (v <= 0) return 'l0';
    if (v <= 4) return 'l1';
    if (v <= 9) return 'l2';
    if (v <= 15) return 'l3';
    return 'l4';
  }

  /* data: 近 371 天的每日成交量（末位 = 今天） */
  function render(root, data) {
    if (!root || !data || data.length !== COLS * ROWS) return;
    var today = new Date();
    var todayRow = (today.getDay() + 6) % 7;               /* 周一=0 … 周日=6 */
    var start = new Date(today.getTime() - (data.length - 1) * 86400000);

    var W = COLS * TOTAL - GAP + PAD * 2;
    var H = ROWS * TOTAL - GAP + 22;

    var html = '<div class="heat-scroll"><svg class="heat" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="近 53 周每日成交量热力图">';

    /* 月份标签（在月份起始周的上方） */
    var lastMonth = -1;
    html += '<g class="heat-months">';
    for (var c = 0; c < COLS; c++) {
      var di0 = c * ROWS + 6 - todayRow;
      if (di0 >= 0 && di0 < data.length) {
        var d0 = new Date(start.getTime() + di0 * 86400000);
        if (d0.getMonth() !== lastMonth) {
          lastMonth = d0.getMonth();
          html += '<text x="' + (PAD + c * TOTAL + 1) + '" y="10" class="heat-month">' + (d0.getMonth() + 1) + '月</text>';
        }
      }
    }
    html += '</g>';

    html += '<g transform="translate(' + PAD + ',20)">';
    for (c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        var idx = c * ROWS + r + 6 - todayRow;
        if (idx < 0 || idx >= data.length) continue;
        var v = data[idx];
        var d = new Date(start.getTime() + idx * 86400000);
        var tip = (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + v + ' 单成交';
        html += '<rect class="heat-cell ' + level(v) + (idx === data.length - 1 ? ' today' : '') +
          '" data-v="' + v + '" data-tip="' + tip + '" x="' + (c * TOTAL) + '" y="' + (r * TOTAL) +
          '" width="' + CELL + '" height="' + CELL + '" rx="2.6"><title>' + tip + '</title></rect>';
      }
    }
    html += '</g></svg></div>';

    /* 图例 */
    html += '<div class="heat-foot"><span class="heat-legend"><span class="hl">少</span>' +
      ['l0', 'l1', 'l2', 'l3', 'l4'].map(function (l) { return '<span class="heat-cell ' + l + '"></span>'; }).join('') +
      '<span class="hl">多</span></span></div>';

    root.innerHTML = html;

    /* 移动端点击查看数值 */
    root.addEventListener('click', function (e) {
      if (window.innerWidth > 820) return;
      var cell = e.target.closest('.heat-cell');
      if (!cell) return;
      window.ResolveUI.toast({ type: 'info', title: cell.getAttribute('data-tip') });
    });
  }

  return { render: render, ROWS: ROWS, COLS: COLS, level: level };
})();