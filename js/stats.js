/* ==================================================================
   stats.js — 02 분석

   왜 "표준 스톱" 으로 묶는가
   -------------------------
   조리개 2.83 / 2.79 같은 실제 기록값을 그대로 세면 막대가 수십 개로
   흩어져 아무것도 읽히지 않습니다. 사진가는 애초에 f/2.8, ISO 800,
   1/125s 같은 스톱 단위로 생각하므로, 가장 가까운 표준 스톱에 붙여
   집계합니다. 눈에 보이는 축과 머릿속의 축을 맞추는 것입니다.

   실패율
   ------
   선명도 하위 25%(사분위)를 "실패" 로 정의합니다. 절대 기준이 아니라
   이번에 넣은 사진들 안에서의 상대 기준입니다 — 카메라·렌즈·해상도가
   바뀌면 절대 점수의 스케일 자체가 달라지기 때문입니다.
   ================================================================== */
(function (global) {
  'use strict';

  var D = document, T = global.Toolkit;
  var $ = function (s, r) { return (r || D).querySelector(s); };

  var photos = [];

  var F_STOPS = [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22];
  var ISO_STOPS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
  var SH_STOPS = [1 / 4000, 1 / 2000, 1 / 1000, 1 / 500, 1 / 250, 1 / 125, 1 / 60,
                  1 / 30, 1 / 15, 1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 15, 30];
  var FOCAL_STOPS = [14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400, 600];

  function snap(v, stops) {
    if (v == null) return null;
    var best = stops[0], bd = Infinity;
    for (var i = 0; i < stops.length; i++) {
      /* 로그 거리로 비교합니다 — 스톱은 곱셈으로 늘어나기 때문입니다 */
      var d = Math.abs(Math.log(v) - Math.log(stops[i]));
      if (d < bd) { bd = d; best = stops[i]; }
    }
    return best;
  }

  function tally(list, keyFn) {
    var m = new Map();
    list.forEach(function (p) {
      var k = keyFn(p);
      if (k == null || k === '') return;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }

  function rows(map, labelFn, sortFn, limit) {
    var arr = Array.from(map.entries()).map(function (e) {
      return { key: e[0], label: labelFn(e[0]), value: e[1] };
    });
    arr.sort(sortFn || function (a, b) { return b.value - a.value; });
    if (limit) arr = arr.slice(0, limit);
    return arr;
  }

  function pctText(n, total) {
    return n + '  ' + Math.round(n / total * 100) + '%';
  }

  /* ---------------------------------------------------------------- */
  function focalOf(p) {
    var e = p.exif || {};
    return snap(e.focal35 || e.focal, FOCAL_STOPS);
  }

  function render() {
    var t = global.I18N.t;
    var n = photos.length;
    var withExif = function (f) { return photos.filter(function (p) { return f(p) != null; }); };

    /* --- 초점거리 --- */
    var fm = tally(photos, focalOf);
    var fRows = rows(fm, function (k) { return k + 'mm'; }, function (a, b) { return a.key - b.key; });
    fRows.forEach(function (r) { r.text = pctText(r.value, n); });
    T.bar($('#c-focal'), fRows, { empty: t('common.none') });
    cover('#c-focal-sub', fm);

    /* --- 조리개 --- */
    var am = tally(photos, function (p) { return snap(p.exif && p.exif.fnum, F_STOPS); });
    var aRows = rows(am, function (k) { return 'f/' + k; }, function (a, b) { return a.key - b.key; });
    aRows.forEach(function (r) { r.text = pctText(r.value, n); });
    T.bar($('#c-fnum'), aRows, { empty: t('common.none') });
    cover('#c-fnum-sub', am);

    /* --- 셔터 --- */
    var sm = tally(photos, function (p) { return snap(p.exif && p.exif.shutter, SH_STOPS); });
    var sRows = rows(sm, function (k) { return T.fmtShutter(k); }, function (a, b) { return a.key - b.key; });
    sRows.forEach(function (r) { r.text = pctText(r.value, n); });
    T.bar($('#c-shutter'), sRows, { empty: t('common.none') });
    cover('#c-shutter-sub', sm);

    /* --- ISO --- */
    var im = tally(photos, function (p) { return snap(p.exif && p.exif.iso, ISO_STOPS); });
    var iRows = rows(im, function (k) { return String(k); }, function (a, b) { return a.key - b.key; });
    iRows.forEach(function (r) { r.text = pctText(r.value, n); });
    T.bar($('#c-iso'), iRows, { empty: t('common.none') });
    cover('#c-iso-sub', im);

    /* --- 시간대 --- */
    var hm = tally(photos, function (p) {
      var d = p.exif && p.exif.shotAt; return d ? d.getHours() : null;
    });
    var hRows = rows(hm, function (k) { return ('0' + k).slice(-2) + ':00'; }, function (a, b) { return a.key - b.key; });
    hRows.forEach(function (r) { r.text = String(r.value); });
    T.bar($('#c-hour'), hRows, { empty: t('common.none') });
    cover('#c-hour-sub', hm);

    /* --- 월별 --- */
    var mm = tally(photos, function (p) {
      var d = p.exif && p.exif.shotAt; return d ? (d.getMonth() + 1) : null;
    });
    var mRows = rows(mm, function (k) { return k + '月'; }, function (a, b) { return a.key - b.key; });
    if (global.I18N.lang !== 'ja') mRows.forEach(function (r) { r.label = r.key + (global.I18N.lang === 'ko' ? '월' : ''); });
    mRows.forEach(function (r) { r.text = String(r.value); });
    T.bar($('#c-month'), mRows, { empty: t('common.none') });
    cover('#c-month-sub', mm);

    /* --- 바디 / 렌즈 --- */
    var bm = tally(photos, function (p) { return p.exif && p.exif.camera; });
    var bRows = rows(bm, function (k) { return short(k, 16); }, null, 8);
    bRows.forEach(function (r) { r.text = pctText(r.value, n); r.hint = r.key; });
    T.bar($('#c-body'), bRows, { empty: t('common.none') });
    cover('#c-body-sub', bm);

    var lm = tally(photos, function (p) { return p.exif && p.exif.lens; });
    var lRows = rows(lm, function (k) { return short(k, 16); }, null, 8);
    lRows.forEach(function (r) { r.text = pctText(r.value, n); r.hint = r.key; });
    T.bar($('#c-lens'), lRows, { empty: t('common.none') });
    cover('#c-lens-sub', lm);

    /* --- 실패율 --- */
    renderFail(sm, fm);

    /* --- 인사이트 타일 --- */
    var topF = fRows.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var topA = aRows.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var topH = hRows.slice().sort(function (a, b) { return b.value - a.value; })[0];
    $('#i-focal').textContent = topF ? topF.label : '—';
    $('#i-focal-sub').textContent = topF ? Math.round(topF.value / n * 100) + '% · ' + topF.value + t('stats.samples') : '';
    $('#i-fnum').textContent = topA ? topA.label : '—';
    $('#i-fnum-sub').textContent = topA ? Math.round(topA.value / n * 100) + '% · ' + topA.value + t('stats.samples') : '';
    $('#i-hour').textContent = topH ? topH.label : '—';
    $('#i-hour-sub').textContent = topH ? topH.value + t('stats.samples') : '';
  }

  /* "이 항목이 기록된 사진이 몇 장인가" — EXIF 가 비어 있는 사진이 섞이면
     막대 합계가 전체 장수와 달라지므로, 그 차이를 숨기지 않고 적어 둡니다. */
  function cover(sel, map) {
    var el = $(sel); if (!el) return;
    var have = 0;
    map.forEach(function (v) { have += v; });
    el.textContent = have + ' / ' + photos.length + ' ' + global.I18N.t('stats.samples');
  }

  function short(s, n) {
    s = String(s);
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  /* 선명도 하위 25% 를 실패로 봅니다 */
  function failThreshold() {
    var vals = photos.map(function (p) { return p.sharp; }).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (!vals.length) return 0;
    return vals[Math.floor(vals.length * 0.25)];
  }

  function renderFail(shutterMap, focalMap) {
    var t = global.I18N.t;
    var th = failThreshold();

    function rateBy(keyFn, stops, labelFn) {
      var buckets = new Map();
      photos.forEach(function (p) {
        var k = keyFn(p);
        if (k == null) return;
        var b = buckets.get(k) || { n: 0, bad: 0 };
        b.n++;
        if (p.sharp <= th) b.bad++;
        buckets.set(k, b);
      });
      return Array.from(buckets.entries())
        .map(function (e) {
          var rate = e[1].bad / e[1].n;
          return {
            key: e[0], label: labelFn(e[0]),
            value: Math.round(rate * 100),
            text: Math.round(rate * 100) + '%  (' + e[1].n + ')',
            n: e[1].n, rate: rate,
            color: rate >= 0.5 ? 'var(--red)' : rate >= 0.25 ? 'var(--amber)' : 'var(--teal)'
          };
        })
        .sort(function (a, b) { return a.key - b.key; });
    }

    var byShutter = rateBy(
      function (p) { return snap(p.exif && p.exif.shutter, SH_STOPS); },
      SH_STOPS, function (k) { return T.fmtShutter(k); });

    var byFocal = rateBy(focalOf, FOCAL_STOPS, function (k) { return k + 'mm'; });

    var host = $('#c-fail');
    host.innerHTML = '<p class="chart-sub" style="margin-bottom:12px">' +
      t('stats.shutter') + ' — ' + t('stats.failRate') + '</p>';
    var sub = D.createElement('div'); host.appendChild(sub);
    T.bar(sub, byShutter, { empty: t('common.none') });

    var host2 = $('#c-fail-focal');
    host2.innerHTML = '<p class="chart-sub" style="margin-bottom:12px">' +
      t('stats.focal') + ' — ' + t('stats.failRate') + '</p>';
    var sub2 = D.createElement('div'); host2.appendChild(sub2);
    T.bar(sub2, byFocal, { empty: t('common.none') });

    /* 손떨림 기준선 — 표본이 5장 이상이면서 실패율 30% 미만인 가장 느린 셔터 */
    var limit = null;
    byShutter.forEach(function (r) {
      if (r.n >= 5 && r.rate < 0.30) { if (!limit || r.key > limit.key) limit = r; }
    });
    $('#i-limit').textContent = limit ? limit.label : '—';
    $('#i-limit-sub').textContent = limit
      ? t('stats.failRate') + ' ' + limit.value + '% · ' + limit.n + t('stats.samples')
      : (photos.length < 20 ? t('stats.samples') + ' < 20' : '—');
  }

  /* ----------------------------------------------------------------
     CSV — analysis/ 의 Python / R 스크립트가 그대로 읽는 형식
     ---------------------------------------------------------------- */
  function exportCsv() {
    var header = ['file', 'shot_at', 'camera', 'lens', 'focal_mm', 'focal35_mm',
                  'f_number', 'shutter_s', 'iso', 'width', 'height',
                  'sharpness', 'sharpness_rank', 'is_fail', 'lat', 'lon'];
    var th = failThreshold();
    var sorted = photos.slice().sort(function (a, b) { return a.sharp - b.sharp; });
    var rank = new Map();
    sorted.forEach(function (p, i) { rank.set(p, (i + 1) / sorted.length); });

    var body = photos.map(function (p) {
      var e = p.exif || {};
      return [
        p.name,
        e.shotAt ? e.shotAt.toISOString() : '',
        e.camera || '', e.lens || '',
        e.focal != null ? e.focal : '',
        e.focal35 != null ? e.focal35 : '',
        e.fnum != null ? e.fnum : '',
        e.shutter != null ? e.shutter : '',
        e.iso != null ? e.iso : '',
        e.w || '', e.h || '',
        Math.round(p.sharp * 100) / 100,
        Math.round(rank.get(p) * 1000) / 1000,
        p.sharp <= th ? 1 : 0,
        e.lat != null ? e.lat : '',
        e.lon != null ? e.lon : ''
      ];
    });
    var d = new Date(), pad = function (x) { return ('0' + x).slice(-2); };
    T.downloadText(T.toCsv(header, body),
      'shutterlog-exif-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.csv',
      'text/csv');
  }

  /* ---------------------------------------------------------------- */
  function onFiles(files) {
    var imgs = files.filter(T.isImage);
    if (!imgs.length) return;
    var prog = $('#progress'), fill = $('#progress-fill'), text = $('#progress-text');
    prog.hidden = false; fill.style.width = '0%';
    text.textContent = global.I18N.t('busy.exif') + ' 0 / ' + imgs.length;

    /* 썸네일은 만들지 않습니다 — 여기서는 숫자만 필요하고,
       수천 장이면 썸네일 생성이 전체 시간의 대부분을 차지합니다. */
    T.analyseAll(imgs, { sharp: true, hash: false, thumb: false }, function (done, total) {
      fill.style.width = (done / total * 100) + '%';
      text.textContent = global.I18N.t('busy.sharp') + '  ' + done + ' / ' + total;
    }).then(function (res) {
      photos = res;
      prog.hidden = true;
      if (!photos.length) return;
      $('#result').hidden = false;
      render();
      $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    $('#btn-csv').addEventListener('click', exportCsv);
    $('#btn-reset').addEventListener('click', function () {
      photos = []; $('#result').hidden = true;
    });

    global.I18N.onChange(function () { if (photos.length) render(); });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
