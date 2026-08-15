/* ==================================================================
   toolkit.js — 세 도구가 함께 쓰는 부품

   드롭존 · EXIF 읽기 · 선명도 측정 · 지각 해시 · 막대그래프 · 파일 저장

   원칙
   -----
   · 사진은 절대 밖으로 나가지 않습니다. 여기 있는 코드는 네트워크를
     한 번도 건드리지 않습니다. 모두 <canvas> 와 FileReader 로 끝납니다.
   · 사진 수천 장을 다루므로 원본 해상도로 디코딩하지 않습니다.
     분석은 항상 512px 로 줄인 뒤에 합니다. (원본을 그대로 그리면
     브라우저 메모리가 먼저 무너집니다)
   ================================================================== */
(function (global) {
  'use strict';

  var D = document;

  /* ----------------------------------------------------------------
     드롭존
     ---------------------------------------------------------------- */
  function dropzone(el, input, onFiles) {
    ['dragenter', 'dragover'].forEach(function (t) {
      el.addEventListener(t, function (e) {
        e.preventDefault(); e.stopPropagation();
        el.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      el.addEventListener(t, function (e) {
        e.preventDefault(); e.stopPropagation();
        if (t === 'dragleave' && el.contains(e.relatedTarget)) return;
        el.classList.remove('is-over');
      });
    });
    el.addEventListener('drop', function (e) {
      var items = e.dataTransfer && e.dataTransfer.files;
      if (items && items.length) onFiles(Array.prototype.slice.call(items));
    });
    if (input) {
      input.addEventListener('change', function () {
        if (input.files && input.files.length) onFiles(Array.prototype.slice.call(input.files));
        input.value = '';
      });
    }
  }

  function isImage(f) { return /^image\/(jpeg|png|webp|tiff)$/i.test(f.type) || /\.(jpe?g|png|webp|tiff?)$/i.test(f.name); }

  /* ----------------------------------------------------------------
     축소 디코딩
     createImageBitmap 이 있으면 그걸 씁니다 — 브라우저가 디코딩 단계에서
     바로 줄여 주기 때문에 원본을 통째로 메모리에 올리지 않습니다.
     ---------------------------------------------------------------- */
  function decodeSmall(file, maxW) {
    maxW = maxW || 512;
    if (global.createImageBitmap) {
      return createImageBitmap(file).then(function (bmp) {
        var s = Math.min(1, maxW / bmp.width);
        var w = Math.max(1, Math.round(bmp.width * s));
        var h = Math.max(1, Math.round(bmp.height * s));
        return createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'medium' })
          .then(function (small) {
            bmp.close && bmp.close();
            return { bitmap: small, w: bmp.width, h: bmp.height };
          })
          .catch(function () { return { bitmap: bmp, w: bmp.width, h: bmp.height }; });
      });
    }
    /* 폴백 — <img> 로 읽고 캔버스에 줄여 그립니다 */
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, maxW / img.naturalWidth);
        var cv = D.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * s));
        cv.height = Math.max(1, Math.round(img.naturalHeight * s));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res({ bitmap: cv, w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }

  function toGray(source, w, h) {
    var cv = D.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data;
    var out = new Float32Array(w * h);
    for (var i = 0, p = 0; i < out.length; i++, p += 4) {
      out[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    }
    return out;
  }

  /* ----------------------------------------------------------------
     선명도 — 라플라시안 분산, 단 두 가지 보정을 넣습니다.

     ① 화면을 4×4 타일로 나누고 "가장 날카로운 타일" 값만 씁니다.
        f/1.4 로 배경을 날린 사진은 화면 전체 분산이 낮아,
        전체 평균으로 재면 잘 찍은 보케 사진이 "흔들림" 으로 찍힙니다.
     ② 반환값은 절대 점수가 아니라 비교용입니다.
        판정은 반드시 같은 그룹 안의 상대 순위로만 합니다. (cull.js)
     ---------------------------------------------------------------- */
  function sharpness(source, w, h) {
    var gray = toGray(source, w, h);
    var TX = 4, TY = 4;
    var best = 0;
    for (var ty = 0; ty < TY; ty++) {
      for (var tx = 0; tx < TX; tx++) {
        var x0 = Math.floor(tx * w / TX), x1 = Math.floor((tx + 1) * w / TX);
        var y0 = Math.floor(ty * h / TY), y1 = Math.floor((ty + 1) * h / TY);
        var sum = 0, sum2 = 0, n = 0;
        for (var y = y0 + 1; y < y1 - 1; y++) {
          for (var x = x0 + 1; x < x1 - 1; x++) {
            var i = y * w + x;
            /* 4-이웃 라플라시안 */
            var L = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
            sum += L; sum2 += L * L; n++;
          }
        }
        if (n > 20) {
          var mean = sum / n;
          var varr = sum2 / n - mean * mean;
          if (varr > best) best = varr;
        }
      }
    }
    return best;
  }

  /* ----------------------------------------------------------------
     dHash — 9×8 로 줄여 가로 이웃끼리 비교한 64비트
     구도가 같은지를 보는 용도입니다 (색·노출 차이에 둔감).
     ---------------------------------------------------------------- */
  function dhash(source) {
    var w = 9, h = 8;
    var gray = toGray(source, w, h);
    var bits = '';
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w - 1; x++) {
        bits += gray[y * w + x] > gray[y * w + x + 1] ? '1' : '0';
      }
    }
    var hex = '';
    for (var i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  }

  function hamming(a, b) {
    if (!a || !b || a.length !== b.length) return 64;
    var d = 0;
    for (var i = 0; i < a.length; i++) {
      var x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
      while (x) { d += x & 1; x >>= 1; }
    }
    return d;
  }

  /* 사진의 지배색 — 액자 액센트 색 자동 선택에 씁니다 */
  function dominantColor(source) {
    var w = 24, h = 16;
    var cv = D.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, w, h);
    var d = g.getImageData(0, 0, w, h).data;
    var best = null, bestScore = -1;
    for (var p = 0; p < d.length; p += 4) {
      var r = d[p], gg = d[p + 1], b = d[p + 2];
      var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      var sat = mx === 0 ? 0 : (mx - mn) / mx;
      var lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
      /* 너무 어둡거나 너무 밝은 화소는 액센트로 쓰기 어렵습니다 */
      var score = sat * (1 - Math.abs(lum - 0.55) * 1.6);
      if (score > bestScore) { bestScore = score; best = [r, gg, b]; }
    }
    if (!best) best = [44, 152, 240];
    return '#' + best.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }

  /* ----------------------------------------------------------------
     EXIF
     ---------------------------------------------------------------- */
  function parseExif(file) {
    if (!global.exifr) return Promise.resolve({});
    return global.exifr.parse(file, {
      tiff: true, exif: true, gps: true, ifd0: true,
      pick: ['Make', 'Model', 'LensModel', 'LensMake', 'DateTimeOriginal', 'CreateDate',
             'FocalLength', 'FocalLengthIn35mmFormat', 'FNumber', 'ExposureTime',
             'ISO', 'ISOSpeedRatings', 'Orientation', 'ExifImageWidth', 'ExifImageHeight',
             'latitude', 'longitude']
    }).then(function (e) { return e || {}; }).catch(function () { return {}; });
  }

  function normExif(e, fallbackW, fallbackH) {
    e = e || {};
    var make = (e.Make || '').trim(), model = (e.Model || '').trim();
    var camera = model
      ? ((make && model.toUpperCase().indexOf(make.split(' ')[0].toUpperCase()) !== 0) ? make + ' ' + model : model)
      : (make || null);
    var dt = e.DateTimeOriginal || e.CreateDate || null;
    if (dt && !(dt instanceof Date)) dt = new Date(dt);
    return {
      camera: camera || null,
      lens: e.LensModel || e.LensMake || null,
      shotAt: (dt && !isNaN(dt)) ? dt : null,
      focal: e.FocalLength != null ? Math.round(e.FocalLength * 10) / 10 : null,
      focal35: e.FocalLengthIn35mmFormat != null ? Math.round(e.FocalLengthIn35mmFormat) : null,
      fnum: e.FNumber != null ? Math.round(e.FNumber * 10) / 10 : null,
      shutter: e.ExposureTime != null ? e.ExposureTime : null,
      iso: e.ISO || e.ISOSpeedRatings || null,
      lat: e.latitude != null ? e.latitude : null,
      lon: e.longitude != null ? e.longitude : null,
      w: e.ExifImageWidth || fallbackW || null,
      h: e.ExifImageHeight || fallbackH || null
    };
  }

  /* ----------------------------------------------------------------
     한 장 처리 (EXIF + 축소본 + 선명도 + 해시)
     ---------------------------------------------------------------- */
  function analyse(file, opts) {
    opts = opts || {};
    return Promise.all([parseExif(file), decodeSmall(file, 512)]).then(function (r) {
      var raw = r[0], dec = r[1];
      var src = dec.bitmap;
      var sw = src.width || dec.w, sh = src.height || dec.h;
      var out = {
        file: file, name: file.name, size: file.size,
        exif: normExif(raw, dec.w, dec.h),
        ratio: dec.w && dec.h ? dec.w / dec.h : (sw / sh),
        thumbUrl: null, sharp: 0, hash: null, color: null
      };
      if (opts.sharp !== false) out.sharp = sharpness(src, Math.min(384, sw), Math.round(Math.min(384, sw) * sh / sw));
      if (opts.hash !== false) out.hash = dhash(src);
      if (opts.color) out.color = dominantColor(src);
      if (opts.thumb !== false) {
        var cv = D.createElement('canvas');
        var tw = 320, th = Math.max(1, Math.round(tw * sh / sw));
        cv.width = tw; cv.height = th;
        cv.getContext('2d').drawImage(src, 0, 0, tw, th);
        out.thumbUrl = cv.toDataURL('image/jpeg', 0.72);
      }
      if (src.close) src.close();
      return out;
    });
  }

  /* 여러 장 — 한 번에 4장씩만 돌려 메모리를 지킵니다 */
  function analyseAll(files, opts, onProgress) {
    files = files.filter(isImage);
    var out = [], i = 0, done = 0;
    var CONC = 4;

    return new Promise(function (resolve) {
      if (!files.length) return resolve(out);
      var running = 0;
      function next() {
        while (running < CONC && i < files.length) {
          var f = files[i++];
          running++;
          analyse(f, opts).then(function (r) { out.push(r); })
            .catch(function () { /* 읽을 수 없는 파일은 건너뜁니다 */ })
            .then(function () {
              running--; done++;
              if (onProgress) onProgress(done, files.length);
              if (done === files.length) resolve(out);
              else next();
            });
        }
      }
      next();
    });
  }

  /* ----------------------------------------------------------------
     표기 helper
     ---------------------------------------------------------------- */
  function fmtShutter(s) {
    if (s == null) return null;
    if (s >= 1) return (Math.round(s * 10) / 10) + 's';
    return '1/' + Math.round(1 / s) + 's';
  }
  function fmtDate(d) {
    if (!d) return null;
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function exifLine(e) {
    var b = [];
    if (e.focal35) b.push(e.focal35 + 'mm'); else if (e.focal) b.push(e.focal + 'mm');
    if (e.fnum) b.push('f/' + e.fnum);
    var s = fmtShutter(e.shutter); if (s) b.push(s);
    if (e.iso) b.push('ISO ' + e.iso);
    return b.join(' · ');
  }

  /* ----------------------------------------------------------------
     막대그래프 (SVG)
     한 계열뿐이므로 색은 하나만 씁니다. 축 눈금 대신 막대 끝에 값을
     직접 적어 읽는 눈의 이동을 줄였습니다.
     ---------------------------------------------------------------- */
  function bar(host, rows, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!rows.length) {
      host.innerHTML = '<p class="chart-empty">' + (opts.empty || '—') + '</p>';
      return;
    }
    var max = 0;
    rows.forEach(function (r) { if (r.value > max) max = r.value; });
    if (max <= 0) max = 1;

    var ul = D.createElement('ul');
    ul.className = 'bars';
    rows.forEach(function (r) {
      var li = D.createElement('li');
      var pct = Math.max(1.5, r.value / max * 100);
      li.innerHTML =
        '<span class="bar-label"></span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(1) + '%' +
          (r.color ? ';background:' + r.color : '') + '"></span></span>' +
        '<span class="bar-value"></span>';
      li.querySelector('.bar-label').textContent = r.label;
      li.querySelector('.bar-value').textContent = r.text != null ? r.text : r.value;
      if (r.hint) li.title = r.hint;
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* ----------------------------------------------------------------
     저장
     ---------------------------------------------------------------- */
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = D.createElement('a');
    a.href = url; a.download = name;
    D.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function downloadText(text, name, type) {
    download(new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' }), name);
  }
  function csvEscape(v) {
    if (v == null) return '';
    v = String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv(header, rows) {
    var out = header.map(csvEscape).join(',') + '\n';
    rows.forEach(function (r) { out += r.map(csvEscape).join(',') + '\n'; });
    return out;
  }

  global.Toolkit = {
    dropzone: dropzone, isImage: isImage,
    decodeSmall: decodeSmall, sharpness: sharpness, dhash: dhash, hamming: hamming,
    dominantColor: dominantColor, parseExif: parseExif, normExif: normExif,
    analyse: analyse, analyseAll: analyseAll,
    fmtShutter: fmtShutter, fmtDate: fmtDate, exifLine: exifLine,
    bar: bar, download: download, downloadText: downloadText, toCsv: toCsv
  };

})(window);
