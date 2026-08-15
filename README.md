# Shutterlog — 사진 · 여행 취미 포트폴리오

한윤수(韓倫洙)의 취미 포트폴리오입니다.
**여행 사진 아카이브**(3D 지구본 + 여행별 앨범)와, 제 촬영 워크플로를 자동화한
**브라우저 도구 3종**(선별 · EXIF 분석 · 액자)으로 이루어져 있습니다.

- 공개 주소: https://yshhan36565362.github.io/shutterlog/
- 메인 포트폴리오: https://yshhan36565362.github.io/githubpage/
- 기본 언어는 일본어이며 日 / 한 / EN 토글이 있습니다.

> **사진은 서버로 전송되지 않습니다.** 도구 3종은 전부 브라우저 안에서만 동작하고
> 업로드도 저장도 하지 않습니다. 탭을 닫으면 아무것도 남지 않습니다.

---

## 1. 가장 먼저 할 일 — 사진 넣기

### ① 폴더에 사진을 넣습니다

```
photos/
  2018-08_hongkong-macau/
  2019-01_taipei/
  2019-08_beijing/
  2023-02_hongkong-macau/
  2023-08_tokyo/
  2024-01_sapporo/
  2024-08_kansai/
  2025-01_nagoya-fuji-tokyo/
  2025-08_europe/
  2026-02_tokyo/
```

**폴더 이름 규칙: `YYYY-MM_영문슬러그`**

| 규칙 | 이유 |
|---|---|
| 연-월로 시작 | 폴더를 이름순으로 정렬하면 그대로 시간순이 됩니다 |
| 구분자는 `_` 하나 | 스크립트가 날짜와 이름을 나누는 기준입니다 |
| 슬러그는 영문 소문자 + `-` | URL 에 그대로 들어갑니다 (`trip.html?id=2024-08_kansai`) |
| 한글·일본어·공백 금지 | GitHub Pages 에서 경로가 깨질 수 있습니다 |

폴더 이름을 바꾸면 `data/trips.meta.json` 의 `folder` 값도 **같이** 바꿔야 합니다.
둘이 맞지 않으면 그 여행은 사진이 없는 것으로 나옵니다.

**넣는 사진은 베스트 컷만.** 여행당 10~20장이면 충분합니다.
GitHub 저장소는 사진 창고가 아니라 포트폴리오이고, 장수가 많을수록 지구본과
갤러리가 무거워집니다.

### ② 스크립트를 돌립니다

```sh
pip install Pillow
python3 build.py
```

`build.py` 가 하는 일:

1. `photos/<폴더>/` 의 JPEG 을 찾습니다
2. EXIF(촬영일시 · 카메라 · 렌즈 · 초점거리 · 조리개 · 셔터 · ISO · GPS)를 읽습니다
3. `thumbs/` 에 썸네일(600px)과 웹용(1600px)을 만듭니다 — **원본은 건드리지 않습니다**
4. `data/trips.meta.json`(사람이 쓴 제목·날짜)과 합쳐 `data/trips.json` / `data/trips.js` 를 씁니다
5. 사진이 아직 없는 여행에는 자리표시자 SVG 를 만듭니다

### ③ 제목과 날짜를 고칩니다

`data/trips.meta.json` 을 열어 각 여행의 `date` / `endDate` 를 **실제 날짜**로 고치고,
`"needsReview": true` 를 `false` 로 바꾸세요.
`true` 인 동안에는 사이트에 노란 「日付要確認」 칩이 붙습니다 — 고쳐야 할 곳을
잊지 않도록 일부러 눈에 띄게 해 둔 것입니다.

대표 사진을 직접 고르고 싶으면 `"cover": "DSC1234.JPG"` 처럼 파일명을 넣으세요.
비워 두면 촬영일시가 가장 빠른 사진이 대표가 됩니다.

### ④ 확인하고 커밋합니다

```sh
python3 -m http.server 8000     # http://localhost:8000 에서 확인
```

확인이 끝나면 GitHub Desktop 에서 커밋 → 푸시하면 됩니다.

> **왜 로컬 서버가 필요한가**
> `index.html` 을 그냥 더블클릭해도 대부분 동작하도록 데이터를 `.js` 로 싣고 있습니다.
> 다만 브라우저에 따라 로컬 파일의 이미지 로딩을 막는 경우가 있으니, 확인은 위
> 명령으로 하는 편이 확실합니다.

---

## 2. 나라를 새로 다녀왔다면

`data/trips.meta.json` 의 `visitedCountries` 에 **ISO 3166-1 숫자 코드**를 추가하면
지구본의 그 나라가 파랗게 칠해집니다. 이미지를 새로 만들 필요가 없습니다.

| 나라 | 코드 | 나라 | 코드 |
|---|---|---|---|
| 일본 | `392` | 영국 | `826` |
| 대만 | `158` | 프랑스 | `250` |
| 중국(홍콩·마카오 포함) | `156` | 독일 | `276` |
| 한국 | `410` | 이탈리아 | `380` |
| 스페인 | `724` | 스위스 | `756` |
| 벨기에 | `056` | 네덜란드 | `528` |

다른 나라 코드는 `data/world-110m.geojson` 에서 `"name"` 으로 검색하면 나옵니다.
`056` 처럼 앞의 0 을 빠뜨리면 안 됩니다 — 문자열로 비교합니다.

---

## 3. 도구 3종

| | 무엇을 하는가 | 주소 |
|---|---|---|
| **01 선별** | 비슷한 컷을 묶고 그 안에서 상대적으로 선명한 한 장을 제안 | `tools/cull.html` |
| **02 분석** | EXIF 분포와 설정별 실패율, CSV 내보내기 | `tools/stats.html` |
| **03 액자** | EXIF 캡션 액자 3종 + 조절 가능한 워터마크 | `tools/frame.html` |

### 01 선별이 그룹을 나누는 방식

시간만으로 묶으면 **3초 안에 다른 것을 찍은 사진까지** 한 그룹에 들어갑니다.
그래서 세 조건을 모두 만족할 때만 같은 그룹으로 봅니다.

1. 촬영 간격 ≤ 설정값(기본 4초)
2. 초점거리 차이 ≤ 설정값(기본 15%) — 줌이 움직였으면 다른 피사체일 확률이 큽니다
3. 구도 해시(dHash) 거리 ≤ 설정값(기본 12)

여기에 보조 규칙이 하나 더 있습니다 — 시간이 3배까지 벌어졌더라도 구도가 아주
비슷하고(거리 ≤ 5) 초점거리도 같으면 같은 그룹으로 봅니다. 자리를 고쳐 잡고 다시
찍은 재촬영을 잡기 위한 것입니다.

**선명도는 절대값으로 쓰지 않습니다.** 조리개를 열어 배경을 날린 사진은 화면 전체의
분산이 낮아 단순 점수로는 "흔들림"으로 오판됩니다. 그래서 화면을 4×4 타일로 나눠
**가장 날카로운 타일**만 보고, 다시 **같은 그룹 안의 상대 순위**로만 판정합니다.

**그리고 이 도구는 아무것도 지우지 않습니다.** 브라우저에는 원본 파일을 지울 권한이
없습니다. 내보내는 `.sh` 도 `rm` 이 아니라 `_to_delete/` 로 **옮기는** 스크립트입니다.

### 02 분석 → Python / R

`tools/stats.html` 에서 내보낸 CSV 를 `analysis/` 의 스크립트에 그대로 넣을 수 있습니다.

```sh
pip install pandas matplotlib
python3 analysis/exif_analysis.py shutterlog-exif-20260815.csv

# R (통계 검정 · 로지스틱 회귀)
Rscript analysis/exif_analysis.R shutterlog-exif-20260815.csv
```

- Python: 분포 · 실패율 · 시간대 · 초점거리×조리개 산점도 · 장비 (그림 5장)
- R: 셔터 속도에 대한 **로지스틱 회귀**로 손떨림 한계를 확률 곡선으로 추정 (그림 3장)

결과는 `analysis/output/` 에 저장됩니다.

---

## 4. 저장소 구조

```
shutterlog/
├── index.html            지구본 + 여행 목록 + 도구 소개 + About
├── trip.html             여행 한 건의 갤러리 (?id=<폴더명>)
├── style.css             사이트 공통
├── tools.css             도구 페이지 전용
├── build.py              ★ 사진을 넣은 뒤 실행하는 스크립트
│
├── js/
│   ├── i18n.js           日 / 한 / EN 문구 (여기 한 곳에 다 있습니다)
│   ├── globe.js          three.js 지구본 + 마커 투영
│   ├── main.js           index 조립
│   ├── trip.js           갤러리 · 정렬 · 라이트박스
│   ├── toolkit.js        도구 공통 (EXIF · 선명도 · 해시 · 그래프)
│   ├── cull.js  stats.js  frame.js
│
├── tools/
│   ├── cull.html  stats.html  frame.html
│
├── data/
│   ├── trips.meta.json   ★ 사람이 편집 (제목 · 날짜 · 좌표 · 방문국)
│   ├── trips.json        build.py 생성 (사람·외부 도구용)
│   ├── trips.js          build.py 생성 (사이트가 읽는 쪽)
│   └── world-110m.js     국가 경계 (Natural Earth 110m)
│
├── vendor/               three.js · exifr · anime.js — 전부 동봉, CDN 없음
├── photos/               ★ 여기에 사진을 넣습니다
├── thumbs/               build.py 생성 (리사이즈본)
└── analysis/             Python · R 분석 스크립트
```

---

## 5. 지키고 있는 규칙

메인 포트폴리오(`githubpage`)의 `DESIGN.md` 에 있는 규칙을 그대로 따릅니다.
2026-08-13 에 CDN 로드 실패로 배포된 사이트가 통째로 망가진 적이 있어 생긴 규칙입니다.

1. **CDN 을 쓰지 않습니다.** 라이브러리는 전부 `vendor/` 에 동봉합니다.
2. **ES 모듈 / import map 을 쓰지 않습니다.** 전부 일반 `<script>` 입니다.
3. **라이브러리가 없어도 페이지는 살아야 합니다.**
   three.js 가 없으면 지구본 자리에 대체 화면이 나오고 여행 목록은 그대로 보입니다.
   anime.js 가 없으면 카운터가 최종값으로 바로 표시됩니다.
4. **숨김의 기본값은 "보임"** 입니다. `.reveal` 은 JS 가 살아 있을 때만 숨김→등장이 켜집니다.
5. **`?v=` 캐시 무효화 숫자를 올립니다.** CSS / JS 를 고칠 때마다 필수입니다.
   (GitHub Pages 가 예전 파일을 계속 내려주는 문제를 실제로 겪었습니다)
6. **`.nojekyll` 을 지우지 마세요.** 없으면 GitHub Pages 의 Jekyll 이
   `_` 로 시작하는 파일·폴더를 무시해 버립니다.

자세한 설계 근거는 [`DESIGN.md`](DESIGN.md) 에 있습니다.

---

## 6. 라이선스 / 출처

- 국가 경계: [Natural Earth](https://www.naturalearthdata.com/) (public domain), `world-atlas` 2.0.2 를 GeoJSON 으로 변환·간소화
- [three.js](https://threejs.org/) (MIT) · [exifr](https://github.com/MikeKovarik/exifr) (MIT) · [anime.js](https://animejs.com/) (MIT)
- 사진의 저작권은 촬영자(한윤수)에게 있습니다.
