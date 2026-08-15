/* ==================================================================
   main.js — index.html 조립

   · 지구본에 넘길 4단계 마커 데이터를 trips.js 에서 만듭니다
   · 여행 카드 목록을 그립니다
   · 헤더 / 모바일 메뉴 / 등장 연출 / 카운터
   · 언어를 바꾸면 동적으로 그린 부분도 다시 그립니다
   ================================================================== */
(function (global) {
  'use strict';

  var D = document;
  var DATA = global.SHUTTERLOG_TRIPS || null;
  var GEO = global.SHUTTERLOG_WORLD || null;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  /* anime.js 게이트웨이 — 없거나 모션을 줄이는 설정이면 null 을 돌려주고,
     호출부는 전부 "null 이면 폴백" 으로 쓰여 있습니다. */
  function A() {
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return null;
    var a = global.anime;
    if (!a) return null;
    return (typeof a.animate === 'function') ? a : null;
  }

  /* ------------------------------------------------------------------
     공통 UI
     ------------------------------------------------------------------ */
  function initChrome() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    var header = $('#site-header');
    var onScroll = function () {
      if (header) header.classList.toggle('is-stuck', global.scrollY > 24);
    };
    onScroll();
    global.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('.js-nav-toggle'), nav = $('#site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* 등장 연출.
     IntersectionObserver 는 "교차 상태가 바뀔 때"만 콜백을 줍니다.
     앵커로 한 번에 점프하면 중간 요소가 한 프레임에 지나가 상태 변화가
     감지되지 않고 영영 opacity:0 으로 남습니다 → sweep() 이 안전망입니다. */
  function initReveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    D.body.classList.add('reveal-ready');

    if (!('IntersectionObserver' in global)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('is-visible', en.isIntersecting);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    els.forEach(function (el) { io.observe(el); });

    function sweep() {
      var h = global.innerHeight;
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < h * 0.94 && r.bottom > 0) el.classList.add('is-visible');
      });
    }
    global.addEventListener('scroll', sweep, { passive: true });
    setTimeout(sweep, 60);
  }

  function runCounters() {
    var nodes = $$('[data-count]');
    if (!nodes.length || !DATA) return;
    var totals = DATA.totals || {};
    nodes.forEach(function (el) {
      var to = totals[el.getAttribute('data-count')] || 0;
      var a = A();
      if (!a) { el.textContent = to; return; }
      var obj = { v: 0 };
      a.animate(obj, {
        v: to, duration: 1400, ease: 'outExpo',
        onUpdate: function () { el.textContent = Math.round(obj.v); },
        onComplete: function () { el.textContent = to; }
      });
    });
  }

  /* ------------------------------------------------------------------
     날짜 표기
     ------------------------------------------------------------------ */
  function fmtRange(a, b) {
    if (!a) return '';
    var s = a.replace(/-/g, '.');
    if (!b || b === a) return s;
    var pa = a.split('-'), pb = b.split('-');
    if (pa[0] === pb[0] && pa[1] === pb[1]) return s + '–' + pb[2];
    if (pa[0] === pb[0]) return s + '–' + pb[1] + '.' + pb[2];
    return s + ' – ' + b.replace(/-/g, '.');
  }

  /* ------------------------------------------------------------------
     지구본 마커 4단계
     ------------------------------------------------------------------ */
  function coverOf(trip) { return trip.cover; }

  function buildLevels() {
    if (!DATA) return [[], [], [], []];
    var trips = DATA.trips || [];
    var pick = global.I18N.pick;

    /* --- 레벨 0 : 대표 한 장 ---------------------------------------
       사진이 들어 있는 여행 중 가장 장수가 많은 것을 대표로 씁니다.
       아직 한 장도 없으면 가장 최근 여행의 자리표시자를 씁니다. */
    var hero = null;
    trips.forEach(function (t) {
      if (!t.hasPhotos) return;
      if (!hero || t.count > hero.count) hero = t;
    });
    if (!hero) hero = trips[trips.length - 1];
    var l0 = [];
    if (hero) {
      var hs = (hero.spots && hero.spots[0]) || { lat: 36, lon: 138 };
      l0.push({
        lat: hs.lat, lon: hs.lon, img: coverOf(hero), size: 152,
        label: pick(hero.title), href: 'trip.html?id=' + encodeURIComponent(hero.folder),
        trip: hero
      });
    }

    /* --- 레벨 1 : 지역 ---------------------------------------------- */
    var l1 = (DATA.regions || []).map(function (rg) {
      var inRegion = trips.filter(function (t) { return t.region === rg.key; });
      if (!inRegion.length) return null;
      var best = inRegion.reduce(function (a, b) { return (b.count > a.count) ? b : a; }, inRegion[0]);
      return {
        lat: rg.lat, lon: rg.lon, img: coverOf(best), size: 122,
        label: pick(rg.name), count: inRegion.length,
        region: rg, trip: best,
        href: 'trip.html?id=' + encodeURIComponent(best.folder)
      };
    }).filter(Boolean);

    /* --- 레벨 2 : 여행 ---------------------------------------------- */
    /* 같은 도시를 여러 번 갔으면 마커가 완전히 겹칩니다.
       같은 좌표에 모인 것들을 경도 방향으로 살짝 벌려 둡니다. */
    var byCoord = {};
    trips.forEach(function (t) {
      var s = (t.spots && t.spots[0]) || { lat: 0, lon: 0 };
      var k = s.lat.toFixed(1) + ',' + s.lon.toFixed(1);
      (byCoord[k] = byCoord[k] || []).push({ t: t, s: s });
    });
    var l2 = [];
    Object.keys(byCoord).forEach(function (k) {
      var arr = byCoord[k], n = arr.length;
      arr.forEach(function (o, i) {
        var spread = n > 1 ? (i - (n - 1) / 2) * 2.6 : 0;
        l2.push({
          lat: o.s.lat + (n > 1 ? spread * 0.35 : 0),
          lon: o.s.lon + spread,
          img: coverOf(o.t), size: 98,
          label: pick(o.t.title), count: o.t.count || 0,
          trip: o.t, href: 'trip.html?id=' + encodeURIComponent(o.t.folder)
        });
      });
    });

    /* --- 레벨 3 : 도시 ---------------------------------------------- */
    var spotMap = {};
    trips.forEach(function (t) {
      (t.spots || []).forEach(function (s) {
        var k = s.key + '@' + s.lat.toFixed(2) + ',' + s.lon.toFixed(2);
        if (!spotMap[k]) spotMap[k] = { spot: s, trips: [] };
        spotMap[k].trips.push(t);
      });
    });
    var l3 = Object.keys(spotMap).map(function (k) {
      var o = spotMap[k];
      var best = o.trips.reduce(function (a, b) { return (b.count > a.count) ? b : a; }, o.trips[0]);
      return {
        lat: o.spot.lat, lon: o.spot.lon, img: coverOf(best), size: 78,
        label: pick(o.spot.name), count: o.trips.length > 1 ? o.trips.length : 0,
        trip: best, spot: o.spot,
        href: 'trip.html?id=' + encodeURIComponent(best.folder)
      };
    });

    /* 집으로 삼은 서울은 사진이 없으니 점으로만 */
    if (DATA.home) l3.push({ lat: DATA.home.lat, lon: DATA.home.lon, dot: true });

    return [l0, l1, l2, l3];
  }

  /* ------------------------------------------------------------------
     지구본
     ------------------------------------------------------------------ */
  var globe = null;

  function initGlobe() {
    var stage = $('#globe'), canvas = $('#globe-canvas'), layer = $('#globe-markers');
    if (!stage || !canvas || !layer) return;

    if (!GEO || !DATA || !global.Shutterglobe) {
      stage.classList.add('no-webgl');
      return;
    }

    var peek = $('#globe-peek');
    var peekImg = $('#peek-img'), peekWhen = $('#peek-when'),
        peekTitle = $('#peek-title'), peekNote = $('#peek-note'), peekLink = $('#peek-link');
    var zoomFill = $('#zoom-fill'), zoomLevel = $('#zoom-level');

    globe = global.Shutterglobe.init({
      stage: stage, canvas: canvas, markerLayer: layer,
      geo: GEO, visited: DATA.visitedCountries || [],
      home: DATA.home && DATA.home.country,
      startLat: 24, startLon: 72,      /* 일본과 유럽이 함께 보이는 시점 */
      levels: buildLevels(),

      onHover: function (item) {
        if (!peek) return;
        if (!item || !item.trip) { peek.classList.remove('is-open'); return; }
        var t = item.trip, pick = global.I18N.pick;
        peekImg.src = t.cover; peekImg.alt = '';
        peekWhen.textContent = fmtRange(t.date, t.endDate);
        peekTitle.textContent = pick(t.title);
        peekNote.textContent = pick(t.note);
        peekLink.href = 'trip.html?id=' + encodeURIComponent(t.folder);
        peek.classList.add('is-open');
      },

      onSelect: function (item, e) {
        /* 아직 멀리서 보고 있으면 한 단계 들어갑니다.
           가까이서 사진을 누르면 그 여행 페이지로 갑니다. */
        if (globe && globe.level < 2 && item.lat != null) {
          if (e) e.preventDefault();
          globe.focus(item.lat, item.lon, globe.level + 1);
        }
      },

      onLevel: function (lv) {
        if (zoomLevel) zoomLevel.textContent = global.I18N.t('level.' + lv);
      },

      onZoom: function (p) {
        if (zoomFill) zoomFill.style.height = Math.round(p * 100) + '%';
      }
    });

    if (!globe.ok) return;

    var zi = $('#zoom-in'), zo = $('#zoom-out');
    if (zi) zi.addEventListener('click', function () { globe.zoomBy(-0.62); });
    if (zo) zo.addEventListener('click', function () { globe.zoomBy(0.62); });

    /* 키보드로도 회전·확대할 수 있게 */
    stage.setAttribute('tabindex', '-1');
    D.addEventListener('keydown', function (e) {
      if (!globe.ok) return;
      var r = stage.getBoundingClientRect();
      if (r.bottom < 80 || r.top > global.innerHeight - 80) return;   /* 화면에 없으면 무시 */
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === '+' || e.key === '=') { globe.zoomBy(-0.3); }
      else if (e.key === '-' || e.key === '_') { globe.zoomBy(0.3); }
    });
  }

  /* ------------------------------------------------------------------
     여행 카드
     ------------------------------------------------------------------ */
  function renderTrips() {
    var grid = $('#trip-grid');
    if (!grid || !DATA) return;
    var pick = global.I18N.pick, t = global.I18N.t;

    /* 최신 여행이 위로 오게 뒤집습니다 (data 는 오래된 순) */
    var trips = (DATA.trips || []).slice().reverse();

    grid.innerHTML = '';
    trips.forEach(function (trip, i) {
      var a = D.createElement('a');
      a.className = 'trip-card reveal' + (i === 0 ? ' is-feature' : '');
      a.href = 'trip.html?id=' + encodeURIComponent(trip.folder);

      var chips = '';
      if (trip.count) chips += '<span class="chip chip--photo">' + trip.count + ' ' + t('card.photos') + '</span>';
      else chips += '<span class="chip chip--empty">' + t('card.empty') + '</span>';
      if (trip.spots && trip.spots.length > 1) {
        chips += '<span class="chip">' + trip.spots.length + ' ' + t('card.cities') + '</span>';
      }
      if (trip.needsReview) chips += '<span class="chip chip--review">' + t('card.review') + '</span>';

      a.innerHTML =
        '<div class="trip-shot">' +
          '<img src="' + trip.cover + '" alt="" loading="lazy" decoding="async" />' +
          '<div class="trip-shot-body">' +
            '<p class="trip-when">' + fmtRange(trip.date, trip.endDate) + '</p>' +
            '<h3></h3>' +
          '</div>' +
        '</div>' +
        '<div class="trip-note"><span class="js-note"></span><div class="trip-chips">' + chips + '</div></div>';

      /* 제목·본문은 textContent 로 넣습니다 (데이터가 HTML 로 해석되지 않도록) */
      $('h3', a).textContent = pick(trip.title);
      $('.js-note', a).textContent = pick(trip.note);

      grid.appendChild(a);
    });

    var axis = $('#axis-label');
    if (axis && trips.length) {
      var first = trips[trips.length - 1].date || '', last = trips[0].date || '';
      axis.textContent = (first.slice(0, 4) || '') + ' → ' + (last.slice(0, 4) || '');
    }
  }

  /* ------------------------------------------------------------------
     시작
     ------------------------------------------------------------------ */
  function boot() {
    global.I18N.bind();
    global.I18N.apply(D);
    initChrome();

    renderTrips();
    initReveal();
    runCounters();
    initGlobe();

    global.I18N.onChange(function () {
      renderTrips();
      initReveal();
      if (globe && globe.ok) {
        globe.setData(buildLevels());
        var zl = $('#zoom-level');
        if (zl) zl.textContent = global.I18N.t('level.' + globe.level);
      }
    });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
