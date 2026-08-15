/* ==================================================================
   trip.js — 여행 한 건의 갤러리

   · 기본은 촬영 일시순. 초점거리·조리개·ISO·셔터·파일명으로도 정렬합니다.
   · 배치는 "저스티파이드 행" 입니다. 세로 사진과 가로 사진이 섞여도
     행의 오른쪽 끝이 가지런히 맞고, 정렬 순서가 읽는 순서 그대로 남습니다.
     (CSS columns 로 하면 위→아래로 흘러서 정렬 순서를 눈으로 따라갈 수 없습니다)
   ================================================================== */
(function (global) {
  'use strict';

  var D = document;
  var DATA = global.SHUTTERLOG_TRIPS || null;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  var trip = null;
  var photos = [];
  var sortKey = 'date', sortDir = 'asc';

  /* ---------------------------------------------------------------- */
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(global.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }

  function fmtRange(a, b) {
    if (!a) return '';
    var s = a.replace(/-/g, '.');
    if (!b || b === a) return s;
    var pa = a.split('-'), pb = b.split('-');
    if (pa[0] === pb[0] && pa[1] === pb[1]) return s + '–' + pb[2];
    if (pa[0] === pb[0]) return s + '–' + pb[1] + '.' + pb[2];
    return s + ' – ' + b.replace(/-/g, '.');
  }

  function fmtShutter(sec) {
    if (!sec) return null;
    if (sec >= 1) return (Math.round(sec * 10) / 10) + 's';
    return '1/' + Math.round(1 / sec) + 's';
  }

  function exifLine(e) {
    if (!e) return global.I18N.t('trip.noexif');
    var bits = [];
    if (e.focal35) bits.push(e.focal35 + 'mm');
    else if (e.focal) bits.push(e.focal + 'mm');
    if (e.fnum) bits.push('f/' + e.fnum);
    var sh = fmtShutter(e.shutter); if (sh) bits.push(sh);
    if (e.iso) bits.push('ISO ' + e.iso);
    return bits.length ? bits.join(' · ') : global.I18N.t('trip.noexif');
  }

  function exifFull(p) {
    var e = p.exif || {}, bits = [];
    if (e.camera) bits.push(e.camera);
    if (e.lens) bits.push(e.lens);
    var line = exifLine(e);
    if (line) bits.push(line);
    if (e.shotAt) bits.push(e.shotAt.replace('T', ' ').slice(0, 16));
    if (!bits.length) bits.push(p.file);
    return bits.join('  ·  ');
  }

  /* ----------------------------------------------------------------
     정렬
     ---------------------------------------------------------------- */
  function sortValue(p, key) {
    var e = p.exif || {};
    switch (key) {
      case 'focal':   return e.focal35 || e.focal || null;
      case 'fnum':    return e.fnum || null;
      case 'iso':     return e.iso || null;
      case 'shutter': return e.shutter || null;
      case 'name':    return p.file.toLowerCase();
      default:        return e.shotAt || null;
    }
  }

  function applySort() {
    var dir = sortDir === 'asc' ? 1 : -1;
    photos.sort(function (a, b) {
      var va = sortValue(a, sortKey), vb = sortValue(b, sortKey);
      /* 값이 없는 사진은 방향과 무관하게 항상 뒤로 보냅니다 */
      if (va == null && vb == null) return a.file.localeCompare(b.file);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -dir;
      if (va > vb) return dir;
      return a.file.localeCompare(b.file);
    });
  }

  /* ----------------------------------------------------------------
     저스티파이드 행 배치
     ---------------------------------------------------------------- */
  var GAP = 10, TARGET_H = 280;

  function layout() {
    var box = $('#gallery');
    if (!box || !photos.length) return;
    var W = box.clientWidth;
    if (W < 10) return;
    /* 좁은 화면에서는 행 높이를 낮춰 한 행에 2장 정도가 들어오게 합니다 */
    var target = W < 560 ? 180 : W < 900 ? 230 : TARGET_H;

    var row = [], rowRatio = 0, i;
    var rows = [];
    for (i = 0; i < photos.length; i++) {
      var p = photos[i];
      var r = p._ratio || 1.5;
      row.push(p); rowRatio += r;
      var wNeeded = rowRatio * target + GAP * (row.length - 1);
      if (wNeeded >= W) { rows.push({ items: row, ratio: rowRatio }); row = []; rowRatio = 0; }
    }
    if (row.length) rows.push({ items: row, ratio: rowRatio, last: true });

    rows.forEach(function (rw) {
      var avail = W - GAP * (rw.items.length - 1);
      var h = avail / rw.ratio;
      /* 마지막 행은 늘리지 않습니다 — 사진 두 장이 화면을 가득 채우면 어색합니다 */
      if (rw.last && h > target * 1.35) h = target;
      rw.items.forEach(function (p) {
        var w = Math.floor((p._ratio || 1.5) * h);
        p._el.style.width = w + 'px';
        p._el.style.height = Math.floor(h) + 'px';
      });
    });
  }

  var rafId = null;
  function relayout() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(layout);
  }

  /* ----------------------------------------------------------------
     렌더
     ---------------------------------------------------------------- */
  function render() {
    var box = $('#gallery');
    box.innerHTML = '';
    applySort();

    photos.forEach(function (p, i) {
      var a = D.createElement('button');
      a.type = 'button';
      a.className = 'shot';
      a.setAttribute('data-i', i);
      a.setAttribute('aria-label', p.file);

      var img = D.createElement('img');
      img.src = p.thumb; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      a.appendChild(img);

      var cap = D.createElement('span');
      cap.className = 'shot-exif';
      cap.textContent = exifLine(p.exif);
      a.appendChild(cap);

      a.addEventListener('click', function () { openLightbox(+a.getAttribute('data-i')); });

      p._el = a;
      box.appendChild(a);
    });

    relayout();
  }

  /* ----------------------------------------------------------------
     라이트박스
     ---------------------------------------------------------------- */
  var lbIndex = 0, lastFocus = null;

  function openLightbox(i) {
    var lb = $('#lightbox');
    lastFocus = D.activeElement;
    lbIndex = i;
    lb.hidden = false;
    D.body.style.overflow = 'hidden';
    showLb();
    $('#lb-close').focus();
  }

  function closeLightbox() {
    $('#lightbox').hidden = true;
    D.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function showLb() {
    var p = photos[lbIndex];
    if (!p) return;
    $('#lb-img').src = p.web || p.thumb;
    $('#lb-img').alt = p.file;
    $('#lb-count').textContent = (lbIndex + 1) + ' ' + global.I18N.t('trip.of') + ' ' + photos.length;
    $('#lb-exif').textContent = exifFull(p);
  }

  function step(d) {
    if (!photos.length) return;
    lbIndex = (lbIndex + d + photos.length) % photos.length;
    showLb();
  }

  /* ----------------------------------------------------------------
     조립
     ---------------------------------------------------------------- */
  function fillHead() {
    var pick = global.I18N.pick, t = global.I18N.t;

    D.title = pick(trip.title) + ' | Shutterlog';
    $('#t-when').textContent = fmtRange(trip.date, trip.endDate);
    $('#t-title').textContent = pick(trip.title);
    $('#t-note').textContent = pick(trip.note);

    var chips = [];
    if (trip.count) chips.push('<span class="chip chip--photo">' + trip.count + ' ' + t('card.photos') + '</span>');
    else chips.push('<span class="chip chip--empty">' + t('card.empty') + '</span>');
    if (trip.spots && trip.spots.length) chips.push('<span class="chip">' + trip.spots.length + ' ' + t('card.cities') + '</span>');
    if (trip.needsReview) chips.push('<span class="chip chip--review">' + t('card.review') + '</span>');
    $('#t-chips').innerHTML = chips.join('');

    var wrap = $('#t-spots-wrap'), list = $('#t-spots');
    if (trip.spots && trip.spots.length) {
      wrap.hidden = false;
      list.innerHTML = '';
      trip.spots.forEach(function (s) {
        var li = D.createElement('li');
        li.textContent = pick(s.name);
        list.appendChild(li);
      });
    } else { wrap.hidden = true; }

    $('#empty-folder').textContent = 'photos/' + trip.folder + '/';
  }

  function notFound() {
    $('#t-title').textContent = 'Not found';
    $('#t-note').textContent = '';
    $('#empty').hidden = false;
    $('#empty-folder').textContent = '';
  }

  function boot() {
    global.I18N.bind();
    global.I18N.apply(D);

    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    var toggle = $('.js-nav-toggle'), nav = $('#site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    var id = param('id');
    if (!DATA || !id) { notFound(); return; }
    trip = (DATA.trips || []).filter(function (t) { return t.folder === id; })[0];
    if (!trip) { notFound(); return; }

    fillHead();

    photos = (trip.photos || []).slice();
    photos.forEach(function (p) {
      var e = p.exif || {};
      p._ratio = (e.w && e.h) ? (e.w / e.h) : 1.5;
      /* build.py 는 회전을 반영해 리사이즈하지만 EXIF 의 w/h 는 원본 값입니다.
         세로 사진이 가로로 잡히면 실제 썸네일을 읽어 보정합니다. */
    });

    if (!photos.length) {
      $('#empty').hidden = false;
      return;
    }

    $('#sortbar').hidden = false;
    render();

    /* 실제 이미지가 로드되면 비율을 실측값으로 교정하고 다시 배치합니다 */
    $('#gallery').addEventListener('load', function (e) {
      var img = e.target;
      if (img.tagName !== 'IMG' || !img.naturalWidth) return;
      var i = +img.parentNode.getAttribute('data-i');
      var p = photos[i];
      if (!p) return;
      var r = img.naturalWidth / img.naturalHeight;
      if (Math.abs(r - p._ratio) > 0.02) { p._ratio = r; relayout(); }
    }, true);

    global.addEventListener('resize', relayout);

    /* 정렬 */
    $$('#sort-opts button').forEach(function (b) {
      b.addEventListener('click', function () {
        sortKey = b.getAttribute('data-sort');
        $$('#sort-opts button').forEach(function (o) {
          o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
        });
        render();
      });
    });
    var dirBtn = $('#sort-dir');
    dirBtn.addEventListener('click', function () {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      dirBtn.setAttribute('data-dir', sortDir);
      dirBtn.innerHTML = (sortDir === 'asc' ? '↑ ' : '↓ ') +
        '<span>' + global.I18N.t(sortDir === 'asc' ? 'trip.asc' : 'trip.desc') + '</span>';
      render();
    });

    /* 라이트박스 */
    $('#lb-close').addEventListener('click', closeLightbox);
    $('#lb-prev').addEventListener('click', function () { step(-1); });
    $('#lb-next').addEventListener('click', function () { step(1); });
    $('#lightbox').addEventListener('click', function (e) {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    D.addEventListener('keydown', function (e) {
      if ($('#lightbox').hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    global.I18N.onChange(function () {
      fillHead();
      render();
      dirBtn.innerHTML = (sortDir === 'asc' ? '↑ ' : '↓ ') +
        '<span>' + global.I18N.t(sortDir === 'asc' ? 'trip.asc' : 'trip.desc') + '</span>';
      if (!$('#lightbox').hidden) showLb();
    });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
