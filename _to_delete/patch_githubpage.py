#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
githubpage(메인 자기소개 사이트)에 'Hobby' 카테고리를 추가합니다.

- index.html : 사이드바 메뉴 + Works 와 Career 사이에 Hobby 섹션
- script.js  : ja / ko / en 번역 + setText 연결
- style.css  : Hobby 카드용 CSS
- ?v= 캐시 무효화 숫자를 7 → 8 로 올립니다

같은 스크립트를 두 번 돌려도 안전합니다 (이미 있으면 건너뜁니다).
"""
import io, os, sys, re

BASE = sys.argv[1] if len(sys.argv) > 1 else "."
IDX = os.path.join(BASE, "index.html")
JS  = os.path.join(BASE, "script.js")
CSS = os.path.join(BASE, "style.css")

def read(p):  return io.open(p, encoding="utf-8").read()
def write(p, s): io.open(p, "w", encoding="utf-8").write(s)

changed = []

# ---------------------------------------------------------------- index.html
html = read(IDX)
if 'id="hobby"' in html:
    print("· index.html : 이미 적용되어 있습니다")
else:
    nav_old = '          <li><a href="#career"  data-nav="career"  id="nav-career">Career</a></li>'
    nav_new = ('          <li><a href="#hobby"   data-nav="hobby"   id="nav-hobby">Hobby</a></li>\n'
               + nav_old)
    assert nav_old in html, "사이드바 메뉴를 찾지 못했습니다"
    html = html.replace(nav_old, nav_new, 1)

    section = '''
    <!-- ------------------------------------------------ Hobby -->
    <!-- 취미(사진·여행) 포트폴리오는 별도 저장소(shutterlog)에 있습니다.
         여기서는 입구만 두고, 본문은 그쪽에서 보여 줍니다. -->
    <section id="hobby" class="section" data-section="hobby">
      <div class="heading-block reveal">
        <span class="heading-meta" id="hobby-meta">Hobby</span>
        <h2 class="section-heading" id="hobby-heading">趣味</h2>
      </div>

      <div class="hobby-card reveal">
        <div class="hobby-visual" aria-hidden="true">
          <span class="hobby-globe"></span>
          <span class="hobby-pin hobby-pin-1"></span>
          <span class="hobby-pin hobby-pin-2"></span>
          <span class="hobby-pin hobby-pin-3"></span>
        </div>
        <div class="hobby-body">
          <h3 id="hobby-title">写真と旅 — Shutterlog</h3>
          <p id="hobby-desc">趣味は写真です。旅から帰るたびに数千枚の中から見せられる十数枚を選ぶ作業を、専攻のデータ分析と結びつけて自動化しました。</p>
          <ul class="hobby-points">
            <li id="hobby-p1">回して近づける 3D 地球儀の旅アーカイブ</li>
            <li id="hobby-p2">ブレたカットの選別・EXIF 分析・額装の 3 ツール</li>
            <li id="hobby-p3">すべてブラウザ内で動作（写真は送信されません）</li>
          </ul>
          <p class="hobby-cta">
            <a class="btn btn-primary" href="https://yshhan36565362.github.io/shutterlog/" target="_blank" rel="noopener" id="hobby-cta">見に行く</a>
            <a class="btn btn-outline" href="https://github.com/YSHHAN36565362/shutterlog" target="_blank" rel="noopener" id="hobby-repo">GitHub</a>
          </p>
        </div>
      </div>
    </section>

'''
    anchor = '    <!-- ------------------------------------------------ Career -->'
    if anchor in html:
        html = html.replace(anchor, section + anchor, 1)
    else:
        anchor2 = '    <section id="career"'
        assert anchor2 in html, "Career 섹션을 찾지 못했습니다"
        html = html.replace(anchor2, section + anchor2, 1)

    changed.append("index.html")

html = html.replace("style.css?v=7", "style.css?v=8").replace("script.js?v=7", "script.js?v=8")
html = html.replace("anime.min.js?v=5", "anime.min.js?v=5")   # 라이브러리는 그대로
write(IDX, html)

# ---------------------------------------------------------------- script.js
js = read(JS)
if "hobby:" in js:
    print("· script.js : 이미 적용되어 있습니다")
else:
    # 언어마다 문구가 다르므로 정규식으로 works 뒤에 hobby 를 끼워 넣습니다
    HOBBY_NAV = {"ja": "Hobby", "ko": "취미", "en": "Hobby"}
    nav_pat = re.compile(r'(nav: \{[^}]*?works: "[^"]*",)(\s*career:)')
    hits = list(nav_pat.finditer(js))
    assert len(hits) == 3, f"nav 객체를 3개 찾아야 하는데 {len(hits)}개입니다"
    for lang, m in zip(["ja", "ko", "en"], reversed(hits)):
        pass
    # 뒤에서부터 치환해야 앞쪽 인덱스가 밀리지 않습니다
    for lang, m in list(zip(["ja", "ko", "en"], hits))[::-1]:
        label = HOBBY_NAV[lang]
        js = js[:m.end(1)] + f' hobby: "{label}",' + js[m.end(1):]

    HOBBY = {
        "ja": '''      hobby: {
        meta: "Hobby",
        heading: "趣味",
        title: "写真と旅 — Shutterlog",
        desc: "趣味は写真です。旅から帰るたびに数千枚の中から見せられる十数枚を選ぶ作業を、専攻のデータ分析と結びつけて自動化しました。",
        p1: "回して近づける 3D 地球儀の旅アーカイブ",
        p2: "ブレたカットの選別・EXIF 分析・額装の 3 ツール",
        p3: "すべてブラウザ内で動作（写真は送信されません）",
        cta: "見に行く",
        repo: "GitHub",
      },
''',
        "ko": '''      hobby: {
        meta: "Hobby",
        heading: "취미",
        title: "사진과 여행 — Shutterlog",
        desc: "취미는 사진입니다. 여행에서 돌아올 때마다 수천 장 중에서 보여줄 십몇 장을 고르는 작업을, 전공인 데이터 분석과 엮어 자동화했습니다.",
        p1: "돌리고 확대하는 3D 지구본 여행 아카이브",
        p2: "흔들린 컷 선별 · EXIF 분석 · 액자 3종 도구",
        p3: "전부 브라우저 안에서 동작 (사진은 전송되지 않습니다)",
        cta: "보러 가기",
        repo: "GitHub",
      },
''',
        "en": '''      hobby: {
        meta: "Hobby",
        heading: "Hobby",
        title: "Photography & Travel — Shutterlog",
        desc: "Photography is my hobby. Picking the dozen worth showing out of a few thousand frames was always the slowest part of every trip, so I automated it and tied it back to the data analysis I study.",
        p1: "A 3D globe archive you can spin and zoom into",
        p2: "Three tools: culling shaken frames, EXIF analysis, framing",
        p3: "Everything runs in the browser — no photo is ever uploaded",
        cta: "Take a look",
        repo: "GitHub",
      },
''',
    }

    # 각 언어 블록의 career 앞에 hobby 를 넣습니다 (등장 순서 = ja, ko, en)
    order = ["ja", "ko", "en"]
    parts, cut, search = [], 0, 0
    for lang in order:
        i = js.index("      career: {", search)
        parts.append(js[cut:i])
        parts.append(HOBBY[lang])
        cut = i
        search = i + 1          # 다음 career 를 찾도록 한 글자 넘깁니다
    parts.append(js[cut:])
    js = "".join(parts)

    # setText 연결
    NAVSET_OLD = '    setText("nav-career", t.nav.career);'
    assert NAVSET_OLD in js
    js = js.replace(NAVSET_OLD, '    setText("nav-hobby", t.nav.hobby);\n' + NAVSET_OLD, 1)

    CAREER_SET = '    setText("career-meta", t.career.meta);'
    assert CAREER_SET in js
    hobby_set = ('    /* --- 趣味 --- */\n'
                 '    setText("hobby-meta", t.hobby.meta);\n'
                 '    setText("hobby-heading", t.hobby.heading);\n'
                 '    setText("hobby-title", t.hobby.title);\n'
                 '    setText("hobby-desc", t.hobby.desc);\n'
                 '    setText("hobby-p1", t.hobby.p1);\n'
                 '    setText("hobby-p2", t.hobby.p2);\n'
                 '    setText("hobby-p3", t.hobby.p3);\n'
                 '    setText("hobby-cta", t.hobby.cta);\n'
                 '    setText("hobby-repo", t.hobby.repo);\n\n')
    js = js.replace(CAREER_SET, hobby_set + CAREER_SET, 1)

    write(JS, js)
    changed.append("script.js")

# ---------------------------------------------------------------- style.css
css = read(CSS)
if ".hobby-card" in css:
    print("· style.css : 이미 적용되어 있습니다")
else:
    css += '''

/* ==================================================================
   Hobby — 취미(사진·여행) 포트폴리오 입구
   본문은 별도 저장소(shutterlog)에 있고 여기서는 카드 하나만 둡니다.
   ================================================================== */
.hobby-card {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 34px;
  align-items: center;
  padding: 34px 36px;
  background: var(--gray);
  border-radius: 3px;
}

/* 왼쪽 장식 — 이미지 파일 없이 CSS 로만 만든 지구본입니다.
   (이미지를 추가하면 로딩 실패 시 빈 칸이 남습니다) */
.hobby-visual { position: relative; width: 160px; height: 160px; margin: 0 auto; }
.hobby-globe {
  position: absolute; inset: 0; border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, #6ab8f6 0%, var(--primary) 45%, #1b6fb5 100%);
  box-shadow: inset -14px -14px 30px rgba(0,0,0,.22), 0 12px 30px rgba(44,152,240,.28);
  overflow: hidden;
}
.hobby-globe::before,
.hobby-globe::after {
  content: ''; position: absolute; left: -10%; right: -10%;
  border-top: 1px solid rgba(255,255,255,.35); border-radius: 50%;
}
.hobby-globe::before { top: 34%; height: 32%; }
.hobby-globe::after  { top: 58%; height: 24%; }

.hobby-pin {
  position: absolute; width: 9px; height: 9px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,.35);
}
.hobby-pin-1 { top: 34%; left: 66%; }
.hobby-pin-2 { top: 45%; left: 28%; }
.hobby-pin-3 { top: 60%; left: 52%; background: var(--c5); box-shadow: 0 0 0 3px rgba(47,164,153,.35); }

.hobby-body h3 { font-size: 22px; margin-bottom: .5em; }
.hobby-body p  { color: var(--body); margin-bottom: 1.1em; }

.hobby-points { margin: 0 0 1.6em; }
.hobby-points li {
  position: relative; padding-left: 20px; margin-bottom: .35em;
  color: var(--dim); font-size: 14px;
}
.hobby-points li::before {
  content: ''; position: absolute; left: 0; top: .85em;
  width: 8px; height: 1px; background: var(--primary);
}

.hobby-cta { display: flex; flex-wrap: wrap; gap: 10px; margin: 0; }

@media (max-width: 768px) {
  .hobby-card { grid-template-columns: 1fr; gap: 22px; padding: 26px 22px; text-align: center; }
  .hobby-points { text-align: left; display: inline-block; }
  .hobby-cta { justify-content: center; }
}
'''
    write(CSS, css)
    changed.append("style.css")

print("✓ 수정:", ", ".join(changed) if changed else "(변경 없음)")
print("  캐시 무효화: ?v=8")
