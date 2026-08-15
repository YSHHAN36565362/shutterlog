/* ==================================================================
   globe.js — 여행 아카이브의 3D 지구본

   설계 메모
   ---------
   · 사진 마커를 WebGL 스프라이트로 그리지 않습니다.
     3D 좌표를 화면 좌표로 "투영"해서 진짜 <img> 를 그 위치에 놓습니다.
     → 사진이 또렷하고, 둥근 모서리·그림자·hover·키보드 포커스가 전부 공짜로 됩니다.

   · 줌 레벨(LOD)에 따라 보이는 마커가 바뀝니다.
       레벨 0 (가장 멀리) : 대표 사진 1장만
       레벨 1             : 지역 (일본 / 중화권 / 유럽)
       레벨 2             : 여행 단위
       레벨 3 (가장 가까이): 도시 단위
     "구체가 가장 클 때는 제일 대표 사진만, 확대하면 지역마다 사진이 보이게"
     라는 요구를 이 4단계로 구현했습니다.

   · WebGL 이 없거나 three.js 가 로드되지 않아도 페이지는 죽지 않습니다.
     .no-webgl 클래스가 붙고 대체 화면이 나옵니다. (DESIGN 규칙 7번)
   ================================================================== */
(function (global) {
  'use strict';

  var RAD = Math.PI / 180;

  /* 카메라 거리 → LOD. 값이 작을수록 가까이 있는 것입니다. */
  var LEVELS = [
    { max: Infinity, min: 3.90 },  // 0 · 전체  — 대표 사진 1장
    { max: 3.90,     min: 3.15 },  // 1 · 지역
    { max: 3.15,     min: 2.50 },  // 2 · 여행
    { max: 2.50,     min: 1.78 }   // 3 · 도시
  ];
  /* 더 가까이 갈 수도 있지만 4096px 텍스처가 뭉개지기 시작합니다.
     마커가 겹치는 문제는 거리가 아니라 화면상 밀어내기로 풀었으므로
     (placeMarkers 참고) 이 이상 붙을 이유가 없습니다. */
  var DIST_MAX = 4.60, DIST_MIN = 1.78;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* 위경도 → 반지름 1 구면 위의 점. 경도 0 이 +Z 를 향합니다. */
  function toVec(lat, lon, r) {
    r = r || 1;
    var b = lat * RAD, l = lon * RAD, cb = Math.cos(b);
    return { x: r * cb * Math.sin(l), y: r * Math.sin(b), z: r * cb * Math.cos(l) };
  }

  /* ----------------------------------------------------------------
     지구본 텍스처 — GeoJSON 을 등장방형(equirectangular) 캔버스에 그립니다.
     런타임에 그리는 이유: 방문국 색칠이 data/trips.json 을 따라가야 하기 때문.
     나라를 하나 추가하면 이미지를 새로 만들 필요 없이 색이 바뀝니다.
     ---------------------------------------------------------------- */
  function paintEarth(geo, visited, homeId, W) {
    W = W || 4096;
    var H = W / 2;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var g = cv.getContext('2d');

    var OCEAN = '#0b1420', LAND = '#223143', LAND_LINE = 'rgba(255,255,255,.10)';
    var VISIT = '#2c98f0', HOME = '#2fa499';

    g.fillStyle = OCEAN; g.fillRect(0, 0, W, H);

    /* 위경선 */
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1;
    for (var lon = -180; lon <= 180; lon += 30) {
      var x = (lon + 180) / 360 * W;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }
    for (var lat = -60; lat <= 60; lat += 30) {
      var y = (90 - lat) / 180 * H;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }

    var px = function (lon) { return (lon + 180) / 360 * W; };
    var py = function (lat) { return (90 - lat) / 180 * H; };

    /* 날짜변경선을 넘는 링은 잘라서 그려야 화면을 가로지르는 줄이 안 생깁니다 */
    function splitRing(ring) {
      var parts = [], cur = [], prev = null;
      for (var i = 0; i < ring.length; i++) {
        var p = ring[i];
        if (prev && Math.abs(p[0] - prev[0]) > 180) { parts.push(cur); cur = []; }
        cur.push(p); prev = p;
      }
      if (cur.length) parts.push(cur);
      return parts;
    }

    function tracePolygon(rings) {
      g.beginPath();
      for (var r = 0; r < rings.length; r++) {
        var chunks = splitRing(rings[r]);
        for (var c = 0; c < chunks.length; c++) {
          var ch = chunks[c];
          if (ch.length < 2) continue;
          g.moveTo(px(ch[0][0]), py(ch[0][1]));
          for (var i = 1; i < ch.length; i++) g.lineTo(px(ch[i][0]), py(ch[i][1]));
          g.closePath();
        }
      }
    }

    var visitSet = {}, i;
    for (i = 0; i < visited.length; i++) visitSet[String(visited[i])] = 1;

    var feats = geo.features;
    for (i = 0; i < feats.length; i++) {
      var f = feats[i];
      var polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      var id = String(f.id);
      var isVisit = !!visitSet[id], isHome = id === String(homeId);

      for (var p = 0; p < polys.length; p++) {
        tracePolygon(polys[p]);
        g.fillStyle = LAND; g.fill('evenodd');
        if (isVisit || isHome) {
          g.save();
          g.globalAlpha = isHome ? 0.62 : 0.5;
          g.fillStyle = isHome ? HOME : VISIT;
          g.fill('evenodd');
          g.restore();
          g.strokeStyle = isHome ? 'rgba(47,164,153,.85)' : 'rgba(44,152,240,.8)';
          g.lineWidth = 2.2;
        } else {
          g.strokeStyle = LAND_LINE;
          g.lineWidth = 1;
        }
        g.stroke();
      }
    }
    return cv;
  }

  /* ----------------------------------------------------------------
     본체
     ---------------------------------------------------------------- */
  function init(opts) {
    var stage = opts.stage;
    var canvas = opts.canvas;
    var layer = opts.markerLayer;

    var THREE = global.THREE;
    var hasWebGL = !!THREE && (function () {
      try {
        var c = document.createElement('canvas');
        return !!(global.WebGLRenderingContext &&
                 (c.getContext('webgl') || c.getContext('experimental-webgl')));
      } catch (e) { return false; }
    })();

    var api = {
      level: 0, dist: DIST_MAX, ok: hasWebGL,
      setData: function () {}, focus: function () {}, zoomBy: function () {},
      setLevel: function () {}, resize: function () {}
    };

    if (!hasWebGL) {
      stage.classList.add('no-webgl');
      return api;
    }

    /* --- 씬 --- */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, DIST_MAX);

    var world = new THREE.Group();      // 지구본 전체를 이 그룹으로 돌립니다
    scene.add(world);

    /* 지표면 */
    var tex = new THREE.CanvasTexture(paintEarth(opts.geo, opts.visited || [], opts.home, 4096));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = Math.min(8, renderer.capabilities ? renderer.capabilities.getMaxAnisotropy() : 1);
    var earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 64),
      new THREE.MeshPhongMaterial({ map: tex, shininess: 6, specular: 0x0d1a28 })
    );
    /* 지도 텍스처의 u=0.5 는 +X 를 향합니다. 우리 마커는 경도 0 을 +Z 로 두므로
       메시를 -90° 돌려 둘을 맞춥니다. 텍스처의 x 계산을 바꾸면 이음매가
       태평양에서 아메리카 대륙 한가운데로 옮겨가 버립니다. */
    earth.rotation.y = -Math.PI / 2;
    world.add(earth);

    /* 대기광 — 구체 바깥으로 번지는 얇은 빛. 지구본이 "떠 보이게" 하는 핵심입니다. */
    var glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true, side: THREE.BackSide, depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(0x2c98f0) } },
        vertexShader:
          'varying float vI;' +
          'void main(){' +
          '  vec3 n = normalize(normalMatrix * normal);' +
          '  vec3 v = normalize((modelViewMatrix * vec4(position,1.0)).xyz);' +
          '  vI = pow(clamp(dot(n, v) + 1.0, 0.0, 1.0), 2.4);' +
          '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);' +
          '}',
        fragmentShader:
          'uniform vec3 uColor; varying float vI;' +
          'void main(){ gl_FragColor = vec4(uColor, 1.0) * vI * 0.42; }'
      })
    );
    scene.add(glow);

    /* 별 */
    (function () {
      var n = 900, pos = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        var t = Math.acos(2 * Math.random() - 1), ph = 2 * Math.PI * Math.random();
        var r = 18 + Math.random() * 22;
        pos[i * 3] = r * Math.sin(t) * Math.cos(ph);
        pos[i * 3 + 1] = r * Math.sin(t) * Math.sin(ph);
        pos[i * 3 + 2] = r * Math.cos(t);
      }
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(gg, new THREE.PointsMaterial({
        color: 0xffffff, size: 0.11, sizeAttenuation: true, transparent: true, opacity: 0.55
      })));
    })();

    scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    var key = new THREE.DirectionalLight(0xdcefff, 1.15);
    key.position.set(2.2, 1.4, 2.6); scene.add(key);
    var rim = new THREE.DirectionalLight(0x2c98f0, 0.5);
    rim.position.set(-2.4, -0.6, -1.4); scene.add(rim);

    /* --- 카메라 상태 --- */
    var yaw = -(opts.startLon || 62) * RAD;   // 경도 L 을 정면으로: yaw = -L
    var pitch = (opts.startLat || 28) * RAD;  // 위도 B 를 정면으로: pitch = B
    var tYaw = yaw, tPitch = pitch;
    var dist = DIST_MAX, tDist = DIST_MAX;
    var spin = 0.014;                          // 자동 회전 (rad/s)
    var idle = 0, dragging = false, moved = false;

    var qY = new THREE.Quaternion(), qX = new THREE.Quaternion();
    var axisY = new THREE.Vector3(0, 1, 0), axisX = new THREE.Vector3(1, 0, 0);

    /* --- 마커 --- */
    var levelData = opts.levels || [[], [], [], []];
    var pool = [];        // 현재 DOM 에 올라간 마커들

    function clearMarkers() {
      for (var i = 0; i < pool.length; i++) if (pool[i].el.parentNode) layer.removeChild(pool[i].el);
      pool = [];
    }

    function buildMarkers(lv) {
      clearMarkers();
      var items = levelData[lv] || [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var el = it.dot ? makeDot() : makeShot(it, lv);
        layer.appendChild(el);
        pool.push({ el: el, item: it, v: toVec(it.lat, it.lon, 1.012), dot: !!it.dot });
      }
    }

    function makeDot() {
      var d = document.createElement('span');
      d.className = 'gdot';
      return d;
    }

    function makeShot(it, lv) {
      var b = document.createElement(it.href ? 'a' : 'button');
      b.className = 'gmarker';
      if (it.href) { b.href = it.href; } else { b.type = 'button'; }
      b.setAttribute('aria-label', it.label || '');

      var size = it.size || (lv === 0 ? 152 : lv === 1 ? 116 : lv === 2 ? 94 : 66);
      var shotH = Math.round(size * 0.68);

      var shot = document.createElement('span');
      shot.className = 'gmarker-shot';
      shot.style.width = size + 'px';
      shot.style.height = shotH + 'px';

      var img = document.createElement('img');
      img.src = it.img; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      shot.appendChild(img);

      if (it.count > 1) {
        var c = document.createElement('span');
        c.className = 'gmarker-count'; c.textContent = it.count;
        shot.appendChild(c);
      }
      b.appendChild(shot);

      var labelH = 0;
      if (it.label) {
        var lb = document.createElement('span');
        lb.className = 'gmarker-label';
        lb.textContent = it.label;
        b.appendChild(lb);
        labelH = 15;
      }

      /* 사진과 실제 지점을 잇는 가는 선. 높이는 매 프레임 다시 정해집니다
         — 마커끼리 겹치면 위로 밀어 올리고 그만큼 선이 길어집니다. */
      var stem = document.createElement('span');
      stem.className = 'gmarker-stem';
      b.appendChild(stem);

      var tip = document.createElement('span');
      tip.className = 'gmarker-tip';
      b.appendChild(tip);

      b.addEventListener('mouseenter', function () { if (opts.onHover) opts.onHover(it); });
      b.addEventListener('focus', function () { if (opts.onHover) opts.onHover(it); });
      b.addEventListener('mouseleave', function () { if (opts.onHover) opts.onHover(null); });
      b.addEventListener('blur', function () { if (opts.onHover) opts.onHover(null); });
      b.addEventListener('click', function (e) {
        if (moved) { e.preventDefault(); return; }
        if (opts.onSelect) opts.onSelect(it, e);
      });

      b._w = size;
      b._h = shotH + labelH;
      b._stem = stem;
      return b;
    }

    /* ----------------------------------------------------------------
       투영 + 겹침 해소

       도시 단위까지 확대하면 오사카·교토·나라처럼 1° 안쪽에 모인 도시들이
       화면에서 몇 px 차이로 완전히 겹칩니다. 구면을 카메라로 가까이 가서
       확대해도 지표면의 각도 차이는 그대로라 저절로 벌어지지 않습니다.

       그래서 겹치는 마커를 화면에서 "위로" 밀어 올리고, 실제 지점과는
       가는 선으로 이어 둡니다. 위치는 거짓말하지 않으면서 사진은 다 보입니다.
       ---------------------------------------------------------------- */
    var tmp = new THREE.Vector3();
    var BASE_LIFT = 16;

    function placeMarkers(w, h) {
      var halfW = w / 2, halfH = h / 2;
      var vis = [];

      for (var i = 0; i < pool.length; i++) {
        var m = pool[i];
        tmp.set(m.v.x, m.v.y, m.v.z).applyQuaternion(world.quaternion);
        var norm = tmp.z;                        /* 카메라는 +Z 에 있습니다 */
        if (norm < 0.06) { hide(m); continue; }
        tmp.project(camera);
        if (tmp.z > 1) { hide(m); continue; }

        m.sx = (tmp.x * halfW) + halfW;
        m.sy = (-tmp.y * halfH) + halfH;
        m.fade = clamp((norm - 0.06) / 0.3, 0, 1);
        m.norm = norm;
        if (m.dot) { placeDot(m); continue; }
        vis.push(m);
      }

      /* 앞(아래)에 있는 것부터 자리를 잡고, 뒤에 오는 것을 위로 밀어 올립니다 */
      vis.sort(function (a, b) { return b.sy - a.sy; });
      var placed = [];
      var maxLift = h * 0.42;

      for (var k = 0; k < vis.length; k++) {
        var m2 = vis[k];
        var mw = m2.el._w || 90, mh = m2.el._h || 60;
        var lift = BASE_LIFT;

        for (var pass = 0; pass < 12; pass++) {
          var moved2 = false;
          for (var j = 0; j < placed.length; j++) {
            var q = placed[j];
            if (Math.abs(m2.sx - q.sx) >= (mw + q.w) / 2 * 0.92) continue;
            var mTop = m2.sy - lift - mh, mBot = m2.sy - lift;
            var qTop = q.sy - q.lift - q.h, qBot = q.sy - q.lift;
            if (mBot > qTop && mTop < qBot) {
              lift = m2.sy - (qTop - 8);
              moved2 = true;
            }
          }
          if (!moved2) break;
        }
        if (lift > maxLift) lift = maxLift;

        m2.lift = lift;
        placed.push({ sx: m2.sx, sy: m2.sy, w: mw, h: mh, lift: lift });
        show(m2, lift);
      }
    }

    function hide(m) {
      m.el.style.opacity = '0';
      m.el.style.pointerEvents = 'none';
    }

    function placeDot(m) {
      m.el.style.left = m.sx.toFixed(1) + 'px';
      m.el.style.top = m.sy.toFixed(1) + 'px';
      m.el.style.opacity = m.fade.toFixed(3);
    }

    function show(m, lift) {
      m.el.style.transform =
        'translate(-50%,-100%) translate(' + m.sx.toFixed(1) + 'px,' + (m.sy - lift).toFixed(1) + 'px)';
      m.el.style.opacity = m.fade.toFixed(3);
      m.el.style.pointerEvents = m.fade > 0.6 ? 'auto' : 'none';
      m.el.style.zIndex = String(100 + Math.round(m.norm * 100));
      if (m.el._stem) m.el._stem.style.height = Math.max(0, lift) + 'px';
    }

    /* --- 레벨 --- */
    function levelFor(d) {
      for (var i = 0; i < LEVELS.length; i++) if (d <= LEVELS[i].max && d > LEVELS[i].min) return i;
      return LEVELS.length - 1;
    }
    var curLevel = -1;
    function syncLevel() {
      var lv = levelFor(dist);
      if (lv !== curLevel) {
        curLevel = lv; api.level = lv;
        buildMarkers(lv);
        if (opts.onLevel) opts.onLevel(lv);
      }
    }

    /* --- 입력 --- */
    var px0 = 0, py0 = 0, vx = 0, vy = 0;

    function onDown(e) {
      dragging = true; moved = false; idle = 0;
      var p = point(e); px0 = p.x; py0 = p.y; vx = vy = 0;
      canvas.style.cursor = 'grabbing';
    }
    function onMove(e) {
      if (!dragging) return;
      var p = point(e), dx = p.x - px0, dy = p.y - py0;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      px0 = p.x; py0 = p.y;
      var k = 0.0042 * (dist / DIST_MAX);
      tYaw += dx * k; vx = dx * k;
      tPitch = clamp(tPitch + dy * k, -78 * RAD, 78 * RAD); vy = dy * k;
      if (e.cancelable) e.preventDefault();
    }
    function onUp() { dragging = false; canvas.style.cursor = 'grab'; setTimeout(function () { moved = false; }, 40); }
    function point(e) {
      var t = e.touches && e.touches[0];
      return { x: t ? t.clientX : e.clientX, y: t ? t.clientY : e.clientY };
    }

    canvas.addEventListener('mousedown', onDown);
    global.addEventListener('mousemove', onMove, { passive: false });
    global.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.style.cursor = 'grab';

    /* 휠 줌.
       "지구본 위에서는 확대, 더 이상 축소할 수 없으면 페이지 스크롤" —
       스크롤을 완전히 가로채면 지구본에서 빠져나갈 수 없게 되므로
       한계에 닿았을 때만 페이지에 스크롤을 돌려줍니다. */
    stage.addEventListener('wheel', function (e) {
      var zoomIn = e.deltaY > 0 ? false : true;   // 위로 굴리면 확대
      var atNear = tDist <= DIST_MIN + 0.001;
      var atFar = tDist >= DIST_MAX - 0.001;
      if ((zoomIn && atNear) || (!zoomIn && atFar)) return;   // 페이지에 넘김
      e.preventDefault();
      idle = 0;
      tDist = clamp(tDist + e.deltaY * 0.0022, DIST_MIN, DIST_MAX);
    }, { passive: false });

    /* 핀치 */
    var pinch0 = 0;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) pinch0 = touchDist(e);
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 2) return;
      var d = touchDist(e);
      if (pinch0) { tDist = clamp(tDist * (pinch0 / d), DIST_MIN, DIST_MAX); idle = 0; }
      pinch0 = d;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    function touchDist(e) {
      var a = e.touches[0], b = e.touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    /* --- 루프 --- */
    var last = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;

      if (!dragging) {
        idle += dt;
        vx *= 0.92; vy *= 0.92;
        tYaw += vx; tPitch = clamp(tPitch + vy, -78 * RAD, 78 * RAD);
        /* 확대한 상태에서 저절로 돌면 보고 있던 곳을 놓칩니다 */
        if (idle > 2.2 && Math.abs(vx) < 0.0004 && dist > LEVELS[0].min) tYaw += spin * dt;
      }

      yaw = lerp(yaw, tYaw, 1 - Math.pow(0.001, dt));
      pitch = lerp(pitch, tPitch, 1 - Math.pow(0.001, dt));
      dist = lerp(dist, tDist, 1 - Math.pow(0.0005, dt));
      api.dist = dist;

      qY.setFromAxisAngle(axisY, yaw);
      qX.setFromAxisAngle(axisX, pitch);
      world.quaternion.copy(qX).multiply(qY);
      glow.quaternion.copy(world.quaternion);
      camera.position.z = dist;

      syncLevel();
      renderer.render(scene, camera);
      placeMarkers(sizeW, sizeH);

      if (opts.onZoom) opts.onZoom((DIST_MAX - dist) / (DIST_MAX - DIST_MIN));
      requestAnimationFrame(frame);
    }

    /* --- 크기 --- */
    var sizeW = 1, sizeH = 1;
    function resize() {
      var r = stage.getBoundingClientRect();
      sizeW = Math.max(1, r.width); sizeH = Math.max(1, r.height);
      renderer.setPixelRatio(Math.min(2, global.devicePixelRatio || 1));
      renderer.setSize(sizeW, sizeH, false);
      camera.aspect = sizeW / sizeH;
      /* 좁은 화면에서 지구본이 잘리지 않게 시야각을 살짝 넓힙니다 */
      camera.fov = sizeW < 700 ? 46 : 38;
      camera.updateProjectionMatrix();
    }
    resize();
    global.addEventListener('resize', resize);

    /* 화면 밖으로 나가면 렌더를 멈춥니다 (배터리) */
    if ('IntersectionObserver' in global) {
      new IntersectionObserver(function (es) {
        var vis = es[0].isIntersecting;
        if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
        running = vis;
      }, { threshold: 0.01 }).observe(stage);
    }

    requestAnimationFrame(frame);

    /* --- 공개 API --- */
    api.setData = function (levels) { levelData = levels; curLevel = -1; syncLevel(); };
    api.zoomBy = function (delta) {
      var before = levelFor(tDist);
      tDist = clamp(tDist + delta, DIST_MIN, DIST_MAX);
      idle = 0;
      var after = levelFor(tDist);
      /* 레벨이 깊어지는 순간, 새 레벨에서 지금 화면 중앙과 가장 가까운 곳으로
         시선을 옮깁니다. 그러지 않으면 확대했는데 아무것도 없는 바다 한가운데가
         나오는 일이 생깁니다. */
      if (after > before) {
        var target = nearestAtLevel(after, -tYaw / RAD, tPitch / RAD);
        if (target) {
          tYaw = -target.lon * RAD;
          tPitch = clamp(target.lat * RAD, -78 * RAD, 78 * RAD);
        }
      }
    };

    function nearestAtLevel(lv, lon, lat) {
      var items = (levelData[lv] || []).filter(function (i) { return !i.dot; });
      if (!items.length) return null;
      var best = null, bd = Infinity;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var dLon = Math.abs(((it.lon - lon + 540) % 360) - 180);
        var d = dLon * dLon + Math.pow(it.lat - lat, 2);
        if (d < bd) { bd = d; best = it; }
      }
      return best;
    }
    api.setLevel = function (lv) {
      lv = clamp(lv, 0, LEVELS.length - 1);
      var L = LEVELS[lv];
      tDist = clamp((L.max === Infinity ? DIST_MAX : (L.max + L.min) / 2), DIST_MIN, DIST_MAX);
      idle = 0;
    };
    api.focus = function (lat, lon, level) {
      tYaw = -lon * RAD; tPitch = clamp(lat * RAD, -78 * RAD, 78 * RAD);
      if (typeof level === 'number') api.setLevel(level);
      idle = 0;
    };
    api.resize = resize;
    return api;
  }

  global.Shutterglobe = { init: init, paintEarth: paintEarth, toVec: toVec };

})(window);
