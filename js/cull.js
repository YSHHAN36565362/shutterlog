/* ==================================================================
   cull.js — 01 선별

   그룹핑 규칙 (여기가 이 도구의 핵심입니다)
   ---------------------------------------
   시간만으로 묶으면 "3초 안에 다른 것을 찍은" 사진까지 한 그룹이 됩니다.
   그래서 세 조건을 모두 만족할 때만 같은 그룹으로 봅니다.

     ① 촬영 간격 ≤ gap 초
     ② 초점거리 차이 ≤ tol %      (줌이 움직였으면 다른 피사체일 확률이 큽니다)
     ③ 구도 해시 거리 ≤ hashMax   (프레임이 실제로 비슷한가)

   여기에 보조 규칙을 하나 더 둡니다 —
     ④ 시간이 gap 의 3배까지 벌어졌더라도 구도 해시가 아주 비슷하고(≤5)
        초점거리도 같다면 같은 그룹으로 봅니다.
        (자리를 고쳐 잡고 다시 찍은 재촬영을 잡기 위해서입니다)

   판정
   ----
   선명도는 절대값으로 쓰지 않습니다. 그룹 안에서 가장 높은 값을 1.0 으로 둔
   상대 점수만 씁니다. 상대 점수가 낮은 컷을 "삭제 후보" 로 제안할 뿐,
   지우는 것은 사람입니다.
   ================================================================== */
(function (global) {
  'use strict';

  var D = document, T = global.Toolkit;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  var photos = [];      // 분석 결과
  var groups = [];      // [{items:[photo], multi:bool}]
  var opt = { gap: 4, tol: 15, hashMax: 12 };
  var MARK_BELOW = 0.55;   // 그룹 내 상대 선명도가 이 값보다 낮으면 기본 후보

  /* ---------------------------------------------------------------- */
  function timeOf(p) {
    var d = p.exif && p.exif.shotAt;
    return d ? d.getTime() : null;
  }
  function focalOf(p) {
    var e = p.exif || {};
    return e.focal35 || e.focal || null;
  }

  function sameFocal(a, b) {
    var fa = focalOf(a), fb = focalOf(b);
    if (fa == null || fb == null) return true;         // 정보가 없으면 막지 않습니다
    var big = Math.max(fa, fb);
    return Math.abs(fa - fb) / big * 100 <= opt.tol;
  }

  function regroup() {
    /* 시간순(없으면 파일명순)으로 세운 뒤 이웃끼리 비교합니다 */
    var sorted = photos.slice().sort(function (a, b) {
      var ta = timeOf(a), tb = timeOf(b);
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      return a.name.localeCompare(b.name);
    });

    groups = [];
    var cur = null;
    sorted.forEach(function (p) {
      if (!cur) { cur = [p]; return; }
      var prev = cur[cur.length - 1];
      var ta = timeOf(prev), tb = timeOf(p);
      var dt = (ta != null && tb != null) ? Math.abs(tb - ta) / 1000 : Infinity;
      var hd = T.hamming(prev.hash, p.hash);

      var join =
        (dt <= opt.gap && sameFocal(prev, p) && hd <= opt.hashMax) ||
        (dt <= opt.gap * 3 && sameFocal(prev, p) && hd <= 5);

      if (join) cur.push(p);
      else { groups.push(cur); cur = [p]; }
    });
    if (cur) groups.push(cur);

    /* 상대 점수 + 기본 후보 표시 */
    groups.forEach(function (g) {
      var max = 0;
      g.forEach(function (p) { if (p.sharp > max) max = p.sharp; });
      g.forEach(function (p) {
        p.rel = max > 0 ? p.sharp / max : 1;
        p.isBest = (p.sharp === max);
        /* 사용자가 손으로 바꾼 것은 존중합니다 */
        if (p.manual !== true) p.marked = (g.length > 1 && !p.isBest && p.rel < MARK_BELOW);
      });
    });
  }

  /* ---------------------------------------------------------------- */
  function render() {
    var box = $('#groups');
    box.innerHTML = '';
    var t = global.I18N.t;

    var multi = groups.filter(function (g) { return g.length > 1; });
    var singles = groups.filter(function (g) { return g.length === 1; });

    $('#s-photos').textContent = photos.length;
    $('#s-groups').textContent = multi.length;
    $('#s-singles').textContent = singles.length;

    /* 여러 장짜리 그룹을 먼저, 그 다음 단독 컷을 한 줄로 */
    multi.forEach(function (g, gi) { box.appendChild(groupEl(g, gi + 1)); });
    if (singles.length) {
      var flat = singles.map(function (g) { return g[0]; });
      box.appendChild(groupEl(flat, null, true));
    }

    updateCount();
  }

  function groupEl(items, no, isSingles) {
    var t = global.I18N.t;
    var sec = D.createElement('section');
    sec.className = 'group';

    var head = D.createElement('div');
    head.className = 'group-head';
    var h = D.createElement('h3');
    if (isSingles) {
      h.textContent = t('cull.singles') + ' · ' + items.length;
    } else {
      var first = items[0].exif && items[0].exif.shotAt;
      h.textContent = '#' + no + '  ' + (first ? T.fmtDate(first) : items[0].name) +
                      '  ·  ' + items.length + t('common.photos');
    }
    head.appendChild(h);
    sec.appendChild(head);

    var strip = D.createElement('div');
    strip.className = 'strip';
    items.forEach(function (p) { strip.appendChild(frameEl(p, !isSingles)); });
    sec.appendChild(strip);
    return sec;
  }

  function frameEl(p, showBest) {
    var t = global.I18N.t;
    var el = D.createElement('div');
    el.className = 'frame' + (p.isBest && showBest ? ' is-best' : '') + (p.marked ? ' is-marked' : '');

    var img = D.createElement('img');
    img.src = p.thumbUrl; img.alt = p.name; img.loading = 'lazy';
    el.appendChild(img);

    if (showBest && p.isBest) {
      var b = D.createElement('span');
      b.className = 'badge badge--best'; b.textContent = t('cull.best');
      el.appendChild(b);
    }
    if (p.marked) {
      var m = D.createElement('span');
      m.className = 'badge badge--marked';
      m.style.left = showBest && p.isBest ? '62px' : '8px';
      m.textContent = t('cull.marked');
      el.appendChild(m);
    }

    var btn = D.createElement('button');
    btn.type = 'button';
    btn.className = 'mark-toggle';
    btn.setAttribute('aria-label', t('cull.markDelete'));
    btn.setAttribute('aria-pressed', p.marked ? 'true' : 'false');
    btn.textContent = p.marked ? '↺' : '✕';
    btn.addEventListener('click', function () {
      p.marked = !p.marked;
      p.manual = true;
      render();
    });
    el.appendChild(btn);

    var body = D.createElement('div');
    body.className = 'frame-body';
    var name = D.createElement('span');
    name.className = 'frame-name'; name.textContent = p.name;
    body.appendChild(name);

    var meta = D.createElement('span');
    meta.className = 'frame-name';
    meta.textContent = T.exifLine(p.exif) || '—';
    body.appendChild(meta);

    var score = D.createElement('div');
    score.className = 'frame-score';
    var pct = Math.round((p.rel != null ? p.rel : 1) * 100);
    var col = pct >= 85 ? 'var(--teal)' : pct >= 55 ? 'var(--amber)' : 'var(--red)';
    score.innerHTML = '<span class="bar-track"><span class="bar-fill" style="width:' + pct +
                      '%;background:' + col + '"></span></span><b>' + pct + '</b>';
    score.title = t('cull.sharp') + ' (' + t('cull.rel') + ')';
    body.appendChild(score);

    el.appendChild(body);
    return el;
  }

  function marked() { return photos.filter(function (p) { return p.marked; }); }

  function updateCount() {
    var n = marked().length;
    $('#s-marked').textContent = n;
    $('#mark-count').textContent = n;
    $('#btn-txt').disabled = n === 0;
    $('#btn-sh').disabled = n === 0;
  }

  /* ----------------------------------------------------------------
     내보내기
     실제 삭제 대신 _to_delete/ 로 "옮기는" 스크립트를 만듭니다.
     되돌릴 수 있는 쪽이 항상 낫습니다.
     ---------------------------------------------------------------- */
  function exportTxt() {
    var list = marked().map(function (p) { return p.name; });
    var head = [
      '# Shutterlog — 削除候補 / 삭제 후보 / delete candidates',
      '# ' + new Date().toISOString(),
      '# ' + list.length + ' files',
      '#',
      '# このリストは提案です。必ず中身を確認してから削除してください。',
      '# 이 목록은 제안입니다. 반드시 확인한 뒤 삭제하세요.',
      '# This list is a suggestion. Review it before deleting anything.',
      ''
    ].join('\n');
    T.downloadText(head + list.join('\n') + '\n', 'shutterlog-cull-' + stamp() + '.txt');
  }

  function exportSh() {
    var list = marked().map(function (p) { return p.name; });
    var lines = [
      '#!/bin/sh',
      '# Shutterlog — 選別結果 / 컬링 결과 / cull result',
      '# ' + new Date().toISOString(),
      '#',
      '# 削除ではなく _to_delete/ へ「移動」します。中身を確認してから',
      '# フォルダごと消してください。',
      '# 삭제가 아니라 _to_delete/ 로 "이동"합니다. 확인한 뒤 폴더째 지우세요.',
      '# This moves files into _to_delete/ instead of removing them.',
      '#',
      '# 使い方 / 사용법 / usage:',
      '#   cd <写真のあるフォルダ> && sh ' + 'shutterlog-cull-' + stamp() + '.sh',
      '',
      'set -e',
      'mkdir -p _to_delete',
      ''
    ];
    list.forEach(function (n) {
      lines.push('[ -f ' + shq(n) + ' ] && mv -n ' + shq(n) + ' _to_delete/ || echo "skip: ' + n.replace(/"/g, '') + '"');
    });
    lines.push('');
    lines.push('echo "moved ' + list.length + ' file(s) into _to_delete/"');
    T.downloadText(lines.join('\n') + '\n', 'shutterlog-cull-' + stamp() + '.sh', 'text/x-shellscript');
  }

  function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }
  function stamp() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  /* ---------------------------------------------------------------- */
  function onFiles(files) {
    var imgs = files.filter(T.isImage);
    if (!imgs.length) return;

    var prog = $('#progress'), fill = $('#progress-fill'), text = $('#progress-text');
    prog.hidden = false;
    fill.style.width = '0%';
    text.textContent = global.I18N.t('busy.exif') + ' 0 / ' + imgs.length;

    T.analyseAll(imgs, { sharp: true, hash: true, thumb: true }, function (done, total) {
      fill.style.width = (done / total * 100) + '%';
      text.textContent = global.I18N.t('busy.sharp') + '  ' + done + ' / ' + total;
    }).then(function (res) {
      photos = res;
      prog.hidden = true;
      if (!photos.length) return;
      $('#result').hidden = false;
      $('#sticky').hidden = false;
      regroup();
      render();
      $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function bindOpts() {
    var map = [
      ['#opt-gap', '#val-gap', 'gap', function (v) { return v + 's'; }],
      ['#opt-focal', '#val-focal', 'tol', function (v) { return v + '%'; }],
      ['#opt-hash', '#val-hash', 'hashMax', function (v) { return v; }]
    ];
    map.forEach(function (m) {
      var input = $(m[0]), out = $(m[1]);
      input.addEventListener('input', function () {
        opt[m[2]] = +input.value;
        out.textContent = m[3](input.value);
        /* 조건을 바꾸면 수동 표시는 유지하되 그룹은 다시 계산합니다 */
        regroup(); render();
      });
    });
  }

  function boot() {
    global.I18N.bind();
    global.I18N.apply(D);
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    var toggle = $('.js-nav-toggle'), nav = $('#site-nav');
    if (toggle && nav) toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    T.dropzone($('#dz'), $('#picker'), onFiles);
    bindOpts();

    $('#btn-txt').addEventListener('click', exportTxt);
    $('#btn-sh').addEventListener('click', exportSh);
    $('#btn-reset').addEventListener('click', function () {
      photos = []; groups = [];
      $('#result').hidden = true;
      $('#sticky').hidden = true;
      $('#groups').innerHTML = '';
    });

    global.I18N.onChange(function () { if (photos.length) render(); });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
