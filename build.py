#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — 사진 폴더를 훑어 사이트가 읽을 data/trips.json 을 만듭니다.

하는 일
  1. photos/<폴더>/ 안의 JPEG 을 찾습니다
  2. EXIF(촬영일시·카메라·렌즈·초점거리·조리개·셔터·ISO·GPS)를 읽습니다
  3. 썸네일(600px)과 웹용(1600px)을 thumbs/ 아래에 만듭니다
  4. data/trips.meta.json(사람이 쓴 제목·날짜·좌표)과 합쳐 data/trips.json 을 씁니다
  5. 사진이 아직 없는 여행에는 자리표시자 SVG 를 만들어 사이트가 비어 보이지 않게 합니다

쓰는 법
  pip install Pillow
  python3 build.py

주의
  - 원본 JPEG 은 건드리지 않습니다. 리사이즈본만 thumbs/ 에 새로 만듭니다.
  - 원본을 GitHub 에 올리고 싶지 않다면 .gitignore 의 해당 줄을 살려 두세요.
    사이트는 thumbs/ 만 있으면 동작합니다.
"""

import json
import os
import sys
import re
import html
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTOS = os.path.join(ROOT, "photos")
THUMBS = os.path.join(ROOT, "thumbs")
DATA = os.path.join(ROOT, "data")

THUMB_W = 600     # 갤러리 타일 / 지구본 마커용
WEB_W = 1600      # 라이트박스용
JPEG_Q = 82

EXT = (".jpg", ".jpeg", ".JPG", ".JPEG", ".png", ".PNG", ".webp")

# 자리표시자 그라데이션 — 여행마다 다른 색이 나오도록 folder 이름 해시로 고릅니다
PALETTE = [
    ("#2c98f0", "#153b63"), ("#2fa499", "#12403c"), ("#a84cb8", "#3d1b44"),
    ("#ec5453", "#4a1c1c"), ("#f9bf3f", "#4a3a10"), ("#4054b2", "#151d44"),
]


# --------------------------------------------------------------------------
# EXIF
# --------------------------------------------------------------------------
def _rational(v):
    """Pillow 는 버전에 따라 IFDRational / (num, den) 튜플을 돌려줍니다."""
    try:
        if isinstance(v, tuple) and len(v) == 2:
            return float(v[0]) / float(v[1]) if v[1] else None
        return float(v)
    except Exception:
        return None


def _gps_deg(value, ref):
    try:
        d = _rational(value[0]) or 0
        m = _rational(value[1]) or 0
        s = _rational(value[2]) or 0
        deg = d + m / 60.0 + s / 3600.0
        if ref in ("S", "W"):
            deg = -deg
        return round(deg, 6)
    except Exception:
        return None


def read_exif(path):
    """사진 한 장의 EXIF 를 사이트가 쓰기 좋은 형태로 뽑습니다."""
    out = {
        "shotAt": None, "camera": None, "lens": None,
        "focal": None, "focal35": None, "fnum": None,
        "shutter": None, "iso": None, "lat": None, "lon": None,
        "w": None, "h": None,
    }
    try:
        from PIL import Image, ExifTags
    except ImportError:
        return out

    try:
        with Image.open(path) as im:
            out["w"], out["h"] = im.size
            exif = im.getexif()
            if not exif:
                return out

            tagmap = {v: k for k, v in ExifTags.TAGS.items()}
            base = {ExifTags.TAGS.get(k, k): v for k, v in exif.items()}

            # 본체 EXIF 는 별도 IFD 에 있습니다
            try:
                sub = exif.get_ifd(tagmap.get("ExifOffset", 0x8769)) or {}
            except Exception:
                sub = {}
            sub = {ExifTags.TAGS.get(k, k): v for k, v in sub.items()}

            def pick(*names):
                for n in names:
                    if n in sub and sub[n] not in (None, ""):
                        return sub[n]
                    if n in base and base[n] not in (None, ""):
                        return base[n]
                return None

            dt = pick("DateTimeOriginal", "DateTimeDigitized", "DateTime")
            if dt:
                try:
                    out["shotAt"] = datetime.strptime(
                        str(dt).strip(), "%Y:%m:%d %H:%M:%S"
                    ).isoformat()
                except Exception:
                    pass

            make = (pick("Make") or "").strip()
            model = (pick("Model") or "").strip()
            if model:
                # "NIKON CORPORATION" + "NIKON Z 6" 처럼 중복되는 경우를 정리합니다
                if make and not model.upper().startswith(make.split()[0].upper()):
                    out["camera"] = f"{make} {model}".strip()
                else:
                    out["camera"] = model
            elif make:
                out["camera"] = make

            lens = pick("LensModel", "LensMake", "LensSpecification")
            if isinstance(lens, str) and lens.strip():
                out["lens"] = lens.strip()

            f = _rational(pick("FocalLength"))
            if f:
                out["focal"] = round(f, 1)
            f35 = pick("FocalLengthIn35mmFilm")
            if f35:
                try:
                    out["focal35"] = int(f35)
                except Exception:
                    pass

            fn = _rational(pick("FNumber"))
            if fn:
                out["fnum"] = round(fn, 1)

            ex = _rational(pick("ExposureTime"))
            if ex:
                out["shutter"] = round(ex, 6)

            iso = pick("ISOSpeedRatings", "PhotographicSensitivity", "ISO")
            if isinstance(iso, (list, tuple)):
                iso = iso[0] if iso else None
            if iso:
                try:
                    out["iso"] = int(iso)
                except Exception:
                    pass

            # GPS
            try:
                gps = exif.get_ifd(0x8825) or {}
                gps = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps.items()}
                if "GPSLatitude" in gps and "GPSLongitude" in gps:
                    out["lat"] = _gps_deg(gps["GPSLatitude"], gps.get("GPSLatitudeRef"))
                    out["lon"] = _gps_deg(gps["GPSLongitude"], gps.get("GPSLongitudeRef"))
            except Exception:
                pass

    except Exception as e:
        print(f"  ! EXIF 실패: {os.path.basename(path)} ({e})")

    return out


# --------------------------------------------------------------------------
# 리사이즈
# --------------------------------------------------------------------------
def make_resized(src, dst, width):
    """이미 있고 원본보다 새것이면 건너뜁니다."""
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return True
    try:
        from PIL import Image, ImageOps
    except ImportError:
        return False
    try:
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)      # 세로 사진이 눕지 않게
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            if im.width > width:
                h = round(im.height * width / im.width)
                im = im.resize((width, h), Image.LANCZOS)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
        return True
    except Exception as e:
        print(f"  ! 리사이즈 실패: {os.path.basename(src)} ({e})")
        return False


# --------------------------------------------------------------------------
# 자리표시자
# --------------------------------------------------------------------------
def make_placeholder(folder, title, subtitle, path):
    """사진이 아직 없는 여행용 SVG. 사진을 넣으면 자동으로 대체됩니다."""
    idx = sum(ord(c) for c in folder) % len(PALETTE)
    c1, c2 = PALETTE[idx]
    t = html.escape(title)  # 현재 SVG 에는 넣지 않습니다 (카드에 제목이 이미 있음)
    s = html.escape(subtitle)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141c28"/><stop offset="1" stop-color="#0a0e15"/>
    </linearGradient>
    <linearGradient id="a" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="{c1}" stop-opacity=".26"/>
      <stop offset=".55" stop-color="{c1}" stop-opacity=".05"/>
      <stop offset="1" stop-color="{c2}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="d" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#fff" opacity=".07"/>
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="url(#g)"/>
  <rect width="1200" height="800" fill="url(#a)"/>
  <rect width="1200" height="800" fill="url(#d)"/>
  <g fill="none" stroke="{c1}" stroke-opacity=".55" stroke-width="7" stroke-linejoin="round">
    <rect x="462" y="296" width="276" height="186" rx="16"/>
    <circle cx="600" cy="389" r="54"/>
    <path d="M520 296l19-30h122l19 30"/>
  </g>
  <text x="600" y="566" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="27" letter-spacing="11" fill="{c1}" fill-opacity=".72">PHOTOS COMING</text>
  <text x="600" y="612" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="23" letter-spacing="7" fill="#fff" fill-opacity=".3">{s}</text>
</svg>
'''
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


# --------------------------------------------------------------------------
def natural_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def main():
    meta_path = os.path.join(DATA, "trips.meta.json")
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    try:
        import PIL  # noqa: F401
        has_pil = True
    except ImportError:
        has_pil = False
        print("※ Pillow 가 없어 EXIF 읽기와 리사이즈를 건너뜁니다.")
        print("  pip install Pillow  (또는 pip install Pillow --break-system-packages)")

    trips_out = []
    total_photos = 0

    for t in meta["trips"]:
        folder = t["folder"]
        src_dir = os.path.join(PHOTOS, folder)
        os.makedirs(src_dir, exist_ok=True)

        files = []
        if os.path.isdir(src_dir):
            files = sorted(
                [f for f in os.listdir(src_dir) if f.endswith(EXT) and not f.startswith(".")],
                key=natural_key,
            )

        photos = []
        for fn in files:
            src = os.path.join(src_dir, fn)
            stem = os.path.splitext(fn)[0]
            rel_thumb = f"thumbs/{folder}/{stem}_600.jpg"
            rel_web = f"thumbs/{folder}/{stem}_1600.jpg"
            ok_t = make_resized(src, os.path.join(ROOT, rel_thumb), THUMB_W)
            ok_w = make_resized(src, os.path.join(ROOT, rel_web), WEB_W)
            ex = read_exif(src) if has_pil else {}
            photos.append({
                "file": fn,
                "thumb": rel_thumb if ok_t else f"photos/{folder}/{fn}",
                "web": rel_web if ok_w else f"photos/{folder}/{fn}",
                "exif": ex,
            })

        # 날짜순 정렬 — EXIF 가 없으면 파일명순을 유지합니다
        photos.sort(key=lambda p: (p["exif"].get("shotAt") or "9999", natural_key(p["file"])))
        total_photos += len(photos)

        # 대표 사진: meta 의 cover → 첫 사진 → 자리표시자
        cover = None
        if t.get("cover"):
            hit = next((p for p in photos if p["file"] == t["cover"]), None)
            cover = hit["thumb"] if hit else None
        if not cover and photos:
            cover = photos[0]["thumb"]
        if not cover:
            ph = f"thumbs/_placeholder/{folder}.svg"
            make_placeholder(
                folder,
                t["title"].get("en", folder),
                (t.get("date") or "")[:7],
                os.path.join(ROOT, ph),
            )
            cover = ph

        out = dict(t)
        out["cover"] = cover
        out["photos"] = photos
        out["count"] = len(photos)
        out["hasPhotos"] = len(photos) > 0
        trips_out.append(out)

    # 날짜순 (오래된 것 → 최신)
    trips_out.sort(key=lambda t: t.get("date") or "9999")

    manifest = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "regions": meta["regions"],
        "home": meta["home"],
        "visitedCountries": meta["visitedCountries"],
        "totals": {
            "trips": len(trips_out),
            "photos": total_photos,
            "countries": len(meta["visitedCountries"]),
            "cities": sum(len(t.get("spots", [])) for t in trips_out),
        },
        "trips": trips_out,
    }

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "trips.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)

    # 사이트는 이쪽(.js)을 읽습니다. fetch 가 아니라 <script> 로 싣기 때문에
    # file:// 로 index.html 을 더블클릭해도 동작합니다. (.json 은 사람·외부 도구용)
    with open(os.path.join(DATA, "trips.js"), "w", encoding="utf-8") as f:
        f.write("/* build.py 가 자동 생성합니다. 직접 고치지 마세요 — "
                "고칠 곳은 data/trips.meta.json 입니다. */\n")
        f.write("window.SHUTTERLOG_TRIPS = ")
        json.dump(manifest, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"✓ data/trips.json — 여행 {len(trips_out)}건 / 사진 {total_photos}장")
    if total_photos == 0:
        print("  사진이 아직 없어 전부 자리표시자입니다. photos/<폴더>/ 에 JPEG 을 넣고 다시 실행하세요.")


if __name__ == "__main__":
    sys.exit(main())
