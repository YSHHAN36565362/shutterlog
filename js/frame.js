/* ==================================================================
   frame.js — 03 액자 · 워터마크

   설계 메모
   ---------
   · 폰트는 이 사이트와 같은 Quicksand + Playfair 를 씁니다.
     액자를 다른 앱으로 만들어 붙인 것이 아니라, 사이트 전체가 하나의
     디자인 언어로 설계됐다는 인상을 주기 위한 선택입니다.
     (웹폰트가 아직 안 왔을 수 있으므로 document.fonts.ready 뒤에 한 번 더 그립니다)

   · 워터마크 "자동" 은 사진 네 귀퉁이의 평균 밝기와 편차를 재서
     가장 어둡고 평평한 곳을 고릅니다. 밝은 구석이면 글자를 검게 바꿉니다.

   · 액자를 켜면 워터마크는 기본적으로 사진 위가 아니라 캡션 줄에 들어갑니다.
     사진을 가리지 않는 쪽이 거의 언제나 낫기 때문입니다.
   ================================================================== */
(function (global) {
  'use strict';

  var D = document, T = global.Toolkit;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };

  var LONG = 2200;                    // 출력 긴 변 (px)

  var st = {
    img: null,                        // ImageBitmap / HTMLImageElement
    exif: {},
    ratio: 'orig',
    style: 'minimal',
    accent: '#2c98f0',
    accentAuto: true,
    cap: { cam: true, lens: true, exp: true, date: true, place: true },
    place: '',
    wmText: 'Younsu Han',
    wmImg: null,
    wmInCaption: true,
    wmPos: 'auto',
    wmColor: '#ffffff',
    wmSize: 32,                       // 0.1% 단위 → 3.2%
    wmOpacity: 70
  };

  var PALETTES = {
    minimal: { paper: '#ffffff', ink: '#111111', sub: '#8a8a8a', rule: '#e2e2e2' },
    film:    { paper: '#131313', ink: '#f2ede4', sub: '#8c8579', rule: '#3a352d' },
    dark:    { paper: '#0b0e13', ink: '#ffffff', sub: '#8d97a5', rule: '#26303e' }
  };

  /* ---------------------------------------------------------------- */
  function fmtDate(d) {
    if (!d) return null;
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate());
  }

  function captionParts() {
    var e = st.exif || {}, left = [], right = [];
    if (st.cap.cam && e.camera) left.push(e.camera);
    if (st.cap.lens && e.lens) left.push(e.lens);
    if (st.cap.exp) {
      var x = T.exifLine(e);
      if (x) right.push(x);
    }
    if (st.cap.date && e.shotAt) right.push(fmtDate(e.shotAt));
    if (st.cap.place && st.place) right.push(st.place);
    return { left: left.join('  ·  '), right: right.join('   ') };
  }

  /* ----------------------------------------------------------------
     레이아웃

     여백은 "가로 몇 %" 가 아니라 사진의 긴 변을 기준으로 한 고정 px 입니다.
     비율로 잡으면 가로 사진에서는 좌우가, 세로 사진에서는 상하가 넓어져
     액자의 테두리 폭이 사진마다 달라집니다. 실제 액자는 그렇지 않습니다.
     ---------------------------------------------------------------- */
  var PAD = { minimal: 0.055, film: 0.070, dark: 0.048 };   // 사진 긴 변 대비
  var CAP = { minimal: 0.105, film: 0.150, dark: 0.098 };   // 캡션 띠 높이

  function photoNatural() {
    var iw = st.img ? (st.img.width || st.img.naturalWidth) : 3;
    var ih = st.img ? (st.img.height || st.img.naturalHeight) : 2;
    return { w: iw, h: ih };
  }

  /* 출력 캔버스 크기와 그 안의 사진 위치를 한 번에 계산합니다 */
  function layout() {
    var nat = photoNatural();
    var pad, cap, W, H, pw, ph;

    if (st.ratio === 'orig') {
      /* 사진의 긴 변을 LONG 으로 두고 여백을 바깥에 더합니다 */
      var s0 = LONG / Math.max(nat.w, nat.h);
      pw = Math.round(nat.w * s0); ph = Math.round(nat.h * s0);
      var longSide = Math.max(pw, ph);
      pad = Math.round(longSide * PAD[st.style]);
      cap = Math.round(longSide * CAP[st.style]);
      W = pw + pad * 2; H = ph + pad * 2 + cap;
    } else {
      var r = st.ratio.split(':');
      var ar = (+r[0]) / (+r[1]);
      if (ar >= 1) { W = LONG; H = Math.round(LONG / ar); }
      else { H = LONG; W = Math.round(LONG * ar); }
      var base = Math.max(W, H);
      pad = Math.round(base * PAD[st.style]);
      cap = Math.round(base * CAP[st.style]);
      var availW = W - pad * 2, availH = H - pad * 2 - cap;
      var s1 = Math.min(availW / nat.w, availH / nat.h);
      pw = Math.round(nat.w * s1); ph = Math.round(nat.h * s1);
    }

    return {
      W: W, H: H, pad: pad, cap: cap,
      photo: {
        x: Math.round((W - pw) / 2),
        y: Math.round(pad + (H - pad * 2 - cap - ph) / 2),
        w: pw, h: ph
      }
    };
  }

  /* ----------------------------------------------------------------
     자동 워터마크 위치 — 네 귀퉁이 중 가장 어둡고 평평한 곳
     ---------------------------------------------------------------- */
  function pickCorner(ctx, box) {
    var W = Math.max(8, Math.round(box.w * 0.24)), H = Math.max(8, Math.round(box.h * 0.16));
    var spots = [
      { key: 'tl', x: box.x, y: box.y },
      { key: 'tr', x: box.x + box.w - W, y: box.y },
      { key: 'bl', x: box.x, y: box.y + box.h - H },
      { key: 'br', x: box.x + box.w - W, y: box.y + box.h - H }
    ];
    var best = null;
    spots.forEach(function (s) {
      var d;
      try { d = ctx.getImageData(s.x, s.y, W, H).data; }
      catch (e) { return; }
      var sum = 0, sum2 = 0, n = 0;
      for (var i = 0; i < d.length; i += 16) {          // 4화소마다 표본
        var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += lum; sum2 += lum * lum; n++;
      }
      if (!n) return;
      var mean = sum / n;
      var sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
      /* 어두울수록 + 평평할수록 좋은 자리. 밝은 구석도 후보로 남기되
         그 경우 글자를 검게 씁니다. */
      var darkScore = (255 - mean) / 255 * 0.65 + (1 - Math.min(1, sd / 70)) * 0.35;
      var lightScore = mean / 255 * 0.65 + (1 - Math.min(1, sd / 70)) * 0.35;
      var score = Math.max(darkScore, lightScore);
      if (!best || score > best.score) {
        best = { key: s.key, score: score, ink: darkScore >= lightScore ? '#ffffff' : '#111111' };
      }
    });
    return best || { key: 'br', ink: '#ffffff' };
  }

  /* ---------------------------------------------------------------- */
  function draw() {
    var cv = $('#frame-canvas');
    if (!st.img) return;
    var L = layout();
    var size = { w: L.W, h: L.H }, photo = L.photo;

    cv.width = size.w; cv.height = size.h;
    var g = cv.getContext('2d');
    var P = PALETTES[st.style];
    var accent = st.accent;

    g.fillStyle = P.paper;
    g.fillRect(0, 0, size.w, size.h);

    if (st.style === 'film') drawFilmBase(g, size, photo, P);

    g.save();
    g.imageSmoothingQuality = 'high';
    g.drawImage(st.img, photo.x, photo.y, photo.w, photo.h);
    g.restore();

    if (st.style === 'dark') {
      var lw = Math.max(2, size.w * 0.0016);
      g.strokeStyle = accent; g.lineWidth = lw;
      g.strokeRect(photo.x - lw / 2, photo.y - lw / 2, photo.w + lw, photo.h + lw);
    }

    drawCaption(g, size, photo, L, P, accent);

    if (!st.wmInCaption) drawOverlayWatermark(g, photo);
  }

  function drawFilmBase(g, size, photo, P) {
    /* 스프로킷 홀 — 사진 위아래 여백에 필름 구멍을 냅니다 */
    var holeW = Math.round(size.w * 0.021), holeH = Math.round(holeW * 0.72);
    var r = Math.max(2, holeW * 0.16);
    var gap = Math.round(holeW * 1.85);
    var top = Math.round(photo.y - holeH - size.w * 0.014);
    var bot = Math.round(photo.y + photo.h + size.w * 0.014);
    if (top < 2 || bot + holeH > size.h - 2) return;
    g.fillStyle = 'rgba(255,255,255,.10)';
    for (var x = photo.x; x + holeW <= photo.x + photo.w; x += gap) {
      roundRect(g, x, top, holeW, holeH, r); g.fill();
      roundRect(g, x, bot, holeW, holeH, r); g.fill();
    }
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawCaption(g, size, photo, L, P, accent) {
    var c = captionParts();
    /* 캡션은 사진 아래가 아니라 "캔버스 하단의 띠" 를 기준으로 놓습니다.
       사진이 세로든 가로든 캡션의 위치가 흔들리지 않습니다. */
    var bandTop = size.h - L.pad - L.cap;
    var padX = photo.x;

    /* 필름 스타일은 사진 바로 아래에 스프로킷 홀이 한 줄 들어가므로
       캡션 전체를 그만큼 아래로 밀어 겹치지 않게 합니다. */
    var off = st.style === 'film' ? L.cap * 0.22 : 0;

    var lineY = Math.round(bandTop + off + L.cap * 0.16);
    g.fillStyle = accent;
    g.fillRect(padX, lineY, Math.round(L.cap * 0.42), Math.max(2, size.w * 0.0022));

    var textY = Math.round(bandTop + off + L.cap * 0.50);
    var f1 = Math.round(L.cap * 0.185);
    g.fillStyle = P.ink;
    g.font = '700 ' + f1 + 'px "Playfair Display", Georgia, serif';
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    if (c.left) g.fillText(c.left, padX, textY);

    var f2 = Math.round(L.cap * 0.135);
    g.fillStyle = P.sub;
    g.font = '600 ' + f2 + 'px "Quicksand", Helvetica, Arial, sans-serif';
    g.textAlign = 'right';
    if (c.right) {
      if (g.letterSpacing !== undefined) g.letterSpacing = (f2 * 0.12).toFixed(1) + 'px';
      g.fillText(c.right, size.w - padX, textY);
      if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    }

    var wy = Math.round(bandTop + off + L.cap * 0.84);

    if (st.wmInCaption) {
      var wh = Math.round(L.cap * 0.20);
      if (st.wmImg) {
        var ar = st.wmImg.width / st.wmImg.height;
        var h = wh * 1.5, w = h * ar;
        g.save();
        g.globalAlpha = st.wmOpacity / 100;
        g.drawImage(st.wmImg, padX, wy - h * 0.8, w, h);
        g.restore();
      } else if (st.wmText) {
        g.save();
        g.globalAlpha = st.wmOpacity / 100;
        g.fillStyle = P.ink;
        g.font = 'italic 400 ' + wh + 'px "Playfair Display", Georgia, serif';
        g.textAlign = 'left';
        g.fillText(st.wmText, padX, wy);
        g.restore();
      }
    }

    /* 오른쪽 끝의 작은 브랜드 마크 — 항상 들어갑니다 */
    g.fillStyle = P.sub;
    g.font = '600 ' + Math.round(L.cap * 0.10) + 'px "Quicksand", Helvetica, sans-serif';
    g.textAlign = 'right';
    if (g.letterSpacing !== undefined) g.letterSpacing = (L.cap * 0.032).toFixed(1) + 'px';
    g.fillText('SHUTTERLOG', size.w - padX, wy);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
  }

  function drawOverlayWatermark(g, photo) {
    if (!st.wmText && !st.wmImg) return;
    var pos = st.wmPos, ink = st.wmColor;
    if (pos === 'auto') {
      var pick = pickCorner(g, photo);
      pos = pick.key; ink = pick.ink;
    }
    var pad = Math.round(Math.min(photo.w, photo.h) * 0.045);
    var size = photo.w * (st.wmSize / 1000);

    g.save();
    g.globalAlpha = st.wmOpacity / 100;

    var w, h;
    if (st.wmImg) {
      h = size * 1.6; w = h * (st.wmImg.width / st.wmImg.height);
    } else {
      g.font = 'italic 400 ' + Math.round(size) + 'px "Playfair Display", Georgia, serif';
      w = g.measureText(st.wmText).width; h = size;
    }

    var x = /r$/.test(pos) ? photo.x + photo.w - pad - w : photo.x + pad;
    var y = /^t/.test(pos) ? photo.y + pad + h : photo.y + photo.h - pad;

    if (st.wmImg) {
      g.drawImage(st.wmImg, x, y - h, w, h);
    } else {
      /* 어느 배경에서도 읽히도록 아주 옅은 그림자를 깝니다 */
      g.shadowColor = ink === '#111111' ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.55)';
      g.shadowBlur = size * 0.5;
      g.fillStyle = ink;
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(st.wmText, x, y);
    }
    g.restore();
  }

  /* ----------------------------------------------------------------
     입력
     ---------------------------------------------------------------- */
  function loadPhoto(file) {
    Promise.all([
      T.parseExif(file),
      T.decodeSmall(file, 2600)         /* 출력 긴 변보다 조금 크게만 디코딩 */
    ]).then(function (r) {
      st.exif = T.normExif(r[0], r[1].w, r[1].h);
      st.img = r[1].bitmap;
      if (st.accentAuto) {
        st.accent = T.dominantColor(st.img);
        $('#accent').value = st.accent;
      }
      $('#editor').hidden = false;
      draw();
      if (D.fonts && D.fonts.ready) D.fonts.ready.then(draw);
      $('#editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function segBind(sel, attr, apply) {
    $$(sel + ' button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$(sel + ' button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        apply(b.getAttribute(attr));
        draw();
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

    T.dropzone($('#dz'), $('#picker'), function (files) {
      var f = files.filter(T.isImage)[0];
      if (f) loadPhoto(f);
    });

    segBind('#seg-style', 'data-style', function (v) { st.style = v; });
    segBind('#seg-ratio', 'data-ratio', function (v) { st.ratio = v; });
    segBind('#seg-pos', 'data-pos', function (v) { st.wmPos = v; });

    $('#accent').addEventListener('input', function () {
      st.accent = this.value; st.accentAuto = false;
      $('#accent-auto').checked = false; draw();
    });
    $('#accent-auto').addEventListener('change', function () {
      st.accentAuto = this.checked;
      if (this.checked && st.img) { st.accent = T.dominantColor(st.img); $('#accent').value = st.accent; }
      draw();
    });

    [['#cap-cam', 'cam'], ['#cap-lens', 'lens'], ['#cap-exp', 'exp'],
     ['#cap-date', 'date'], ['#cap-place', 'place']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { st.cap[p[1]] = this.checked; draw(); });
    });

    $('#place').addEventListener('input', function () { st.place = this.value; draw(); });
    $('#wm-text').addEventListener('input', function () { st.wmText = this.value; draw(); });

    $('#wm-img').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) { st.wmImg = null; draw(); return; }
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () { st.wmImg = im; draw(); };
      im.src = url;
    });

    $('#wm-in-caption').addEventListener('change', function () {
      st.wmInCaption = this.checked;
      $('#wm-overlay-opts').style.opacity = this.checked ? '.4' : '1';
      $('#wm-overlay-opts').style.pointerEvents = this.checked ? 'none' : 'auto';
      draw();
    });
    $('#wm-overlay-opts').style.opacity = '.4';
    $('#wm-overlay-opts').style.pointerEvents = 'none';

    $('#wm-color').addEventListener('input', function () { st.wmColor = this.value; draw(); });
    $('#wm-size').addEventListener('input', function () {
      st.wmSize = +this.value;
      $('#val-size').textContent = (this.value / 10).toFixed(1) + '%';
      draw();
    });
    $('#wm-op').addEventListener('input', function () {
      st.wmOpacity = +this.value;
      $('#val-op').textContent = this.value + '%';
      draw();
    });

    $('#btn-png').addEventListener('click', function () { save('png'); });
    $('#btn-jpg').addEventListener('click', function () { save('jpg'); });
    $('#btn-reset').addEventListener('click', function () {
      st.img = null; $('#editor').hidden = true;
    });

    global.I18N.onChange(function () { if (st.img) draw(); });
  }

  function save(kind) {
    var cv = $('#frame-canvas');
    if (!st.img) { alert(global.I18N.t('frame.pickFirst')); return; }
    var mime = kind === 'png' ? 'image/png' : 'image/jpeg';
    cv.toBlob(function (blob) {
      var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
      var name = 'shutterlog-' + st.style + '-' +
        d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
        p(d.getHours()) + p(d.getMinutes()) + '.' + kind;
      T.download(blob, name);
    }, mime, kind === 'png' ? undefined : 0.94);
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window);
