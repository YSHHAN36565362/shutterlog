#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
exif_analysis.py — 브라우저에서 내보낸 CSV 를 받아 촬영 습관을 분석합니다.

입력
    tools/stats.html 의 "CSV 를 書き出す" 로 받은 shutterlog-exif-YYYYMMDD.csv
    열: file, shot_at, camera, lens, focal_mm, focal35_mm, f_number,
        shutter_s, iso, width, height, sharpness, sharpness_rank, is_fail, lat, lon

쓰는 법
    pip install pandas matplotlib
    python3 exif_analysis.py shutterlog-exif-20260815.csv

나오는 것
    analysis/output/*.png  — 그림 5장
    표준출력             — 요약 리포트

왜 브라우저와 따로 두는가
    브라우저 쪽 대시보드는 "지금 이 폴더" 를 훑어보기 위한 것입니다.
    여기서는 여러 여행의 CSV 를 합쳐 시간에 따른 변화까지 볼 수 있고,
    회귀처럼 브라우저에서 하기 번거로운 계산을 붙일 수 있습니다.
"""

import os
import sys
import math

import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams

# 사이트와 같은 팔레트를 씁니다 (그림이 사이트에 그대로 들어가도 어색하지 않게)
BLUE, TEAL, AMBER, RED, INK, GRID = "#2c98f0", "#2fa499", "#f9bf3f", "#ec5453", "#1b2431", "#e6e6e6"

# 그림 제목이 일/한/영 3개국어라 CJK 글꼴이 없으면 □ 로 깨집니다.
# 설치된 것 중에서 쓸 수 있는 것을 자동으로 고릅니다.
def _pick_cjk_font():
    from matplotlib import font_manager
    prefer = ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Apple SD Gothic Neo",
              "Noto Sans CJK JP", "Noto Sans CJK KR", "Noto Sans JP", "Noto Sans KR",
              "Yu Gothic", "Malgun Gothic", "Microsoft YaHei", "AppleGothic"]
    have = {f.name for f in font_manager.fontManager.ttflist}
    return [n for n in prefer if n in have]

_CJK = _pick_cjk_font()
if not _CJK:
    print("※ CJK 글꼴을 찾지 못했습니다. 그림의 일본어·한국어 제목이 □ 로 나올 수 있습니다.")
    print("  macOS 라면 보통 Hiragino Sans 가 있습니다. 없으면 Noto Sans CJK 를 설치하세요.")

rcParams.update({
    "figure.dpi": 130,
    "savefig.dpi": 130,
    "font.size": 9,
    "font.family": "sans-serif",
    "font.sans-serif": _CJK + ["DejaVu Sans", "Helvetica", "Arial"],
    "axes.unicode_minus": False,
    "axes.edgecolor": "#cfd4dc",
    "axes.labelcolor": INK,
    "axes.titlesize": 11,
    "axes.titleweight": "bold",
    "text.color": INK,
    "xtick.color": "#6b7280",
    "ytick.color": "#6b7280",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

F_STOPS = [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22]
ISO_STOPS = [50, 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600]
SH_STOPS = [1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60,
            1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30]
FOCAL_STOPS = [14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400, 600]


def snap(v, stops):
    """가장 가까운 표준 스톱으로 붙입니다 (로그 거리 — 스톱은 곱셈으로 늘어나므로)."""
    if pd.isna(v) or v <= 0:
        return float("nan")
    return min(stops, key=lambda s: abs(math.log(v) - math.log(s)))


def shutter_label(s):
    if pd.isna(s):
        return ""
    return f"{s:.0f}s" if s >= 1 else f"1/{round(1/s)}s"


def load(path):
    df = pd.read_csv(path)
    df["shot_at"] = pd.to_datetime(df["shot_at"], errors="coerce", utc=True)
    for c in ["focal_mm", "focal35_mm", "f_number", "shutter_s", "iso", "sharpness", "sharpness_rank"]:
        if c in df:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    df["focal_use"] = df["focal35_mm"].fillna(df["focal_mm"])
    df["focal_snap"] = df["focal_use"].apply(lambda v: snap(v, FOCAL_STOPS))
    df["f_snap"] = df["f_number"].apply(lambda v: snap(v, F_STOPS))
    df["iso_snap"] = df["iso"].apply(lambda v: snap(v, ISO_STOPS))
    df["sh_snap"] = df["shutter_s"].apply(lambda v: snap(v, SH_STOPS))
    df["hour"] = df["shot_at"].dt.hour
    df["month"] = df["shot_at"].dt.tz_localize(None).dt.to_period("M").astype(str)

    # is_fail 은 브라우저 쪽에서 이미 "선명도 하위 25%" 로 계산돼 있습니다.
    # 여러 CSV 를 합쳐 쓸 때는 여기서 다시 계산하는 편이 맞습니다.
    if "is_fail" not in df or df["is_fail"].isna().all():
        th = df["sharpness"].quantile(0.25)
        df["is_fail"] = (df["sharpness"] <= th).astype(int)
    return df


def hbar(ax, labels, values, color=BLUE, fmt="{:.0f}"):
    y = range(len(labels))
    ax.barh(list(y), values, color=color, height=.62)
    ax.set_yticks(list(y))
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.xaxis.grid(True, color=GRID, lw=.8)
    ax.set_axisbelow(True)
    for i, v in enumerate(values):
        ax.text(v, i, "  " + fmt.format(v), va="center", ha="left", fontsize=8, color="#6b7280")


def fig_distributions(df):
    fig, axes = plt.subplots(2, 2, figsize=(11, 7.2))
    fig.suptitle("撮影設定の分布 / 촬영 설정 분포 / Setting distributions", fontsize=13, fontweight="bold")

    s = df["focal_snap"].dropna().value_counts().sort_index()
    hbar(axes[0][0], [f"{int(k)}mm" for k in s.index], s.values, BLUE)
    axes[0][0].set_title("焦点距離 / 초점거리 / Focal length")

    s = df["f_snap"].dropna().value_counts().sort_index()
    hbar(axes[0][1], [f"f/{k:g}" for k in s.index], s.values, TEAL)
    axes[0][1].set_title("絞り / 조리개 / Aperture")

    s = df["sh_snap"].dropna().value_counts().sort_index()
    hbar(axes[1][0], [shutter_label(k) for k in s.index], s.values, AMBER)
    axes[1][0].set_title("シャッター / 셔터 / Shutter")

    s = df["iso_snap"].dropna().value_counts().sort_index()
    hbar(axes[1][1], [f"{int(k)}" for k in s.index], s.values, "#a84cb8")
    axes[1][1].set_title("ISO")

    fig.tight_layout(rect=[0, 0, 1, .95])
    fig.savefig(os.path.join(OUT, "01-distributions.png"))
    plt.close(fig)


def fig_failure(df):
    """실패율 — 이 프로젝트의 핵심 그림입니다."""
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.4))
    fig.suptitle("設定ごとの失敗率 / 설정별 실패율 / Failure rate by setting",
                 fontsize=13, fontweight="bold")

    def rate(col, labeler, ax, title):
        g = df.dropna(subset=[col]).groupby(col)["is_fail"].agg(["mean", "size"])
        g = g[g["size"] >= 3]                     # 표본 3장 미만은 신뢰할 수 없습니다
        if g.empty:
            ax.text(.5, .5, "sample < 3", ha="center", va="center"); ax.axis("off"); return
        labels = [f"{labeler(k)}  (n={int(n)})" for k, n in zip(g.index, g["size"])]
        vals = (g["mean"] * 100).values
        colors = [RED if v >= 50 else AMBER if v >= 25 else TEAL for v in vals]
        y = range(len(labels))
        ax.barh(list(y), vals, color=colors, height=.62)
        ax.set_yticks(list(y)); ax.set_yticklabels(labels); ax.invert_yaxis()
        ax.set_xlim(0, 100); ax.set_xlabel("%")
        ax.xaxis.grid(True, color=GRID, lw=.8); ax.set_axisbelow(True)
        ax.set_title(title)
        for i, v in enumerate(vals):
            ax.text(v, i, f"  {v:.0f}%", va="center", ha="left", fontsize=8, color="#6b7280")

    rate("sh_snap", shutter_label, axes[0], "シャッター速度 / 셔터 속도")
    rate("focal_snap", lambda k: f"{int(k)}mm", axes[1], "焦点距離 / 초점거리")

    fig.tight_layout(rect=[0, 0, 1, .93])
    fig.savefig(os.path.join(OUT, "02-failure-rate.png"))
    plt.close(fig)


def fig_hour(df):
    fig, ax = plt.subplots(figsize=(9, 3.4))
    s = df["hour"].dropna().value_counts().reindex(range(24), fill_value=0)
    ax.bar(s.index, s.values, color=BLUE, width=.72)
    ax.set_xticks(range(0, 24, 2))
    ax.set_xlabel("hour")
    ax.set_title("撮影時間帯 / 촬영 시간대 / Hour of day")
    ax.yaxis.grid(True, color=GRID, lw=.8); ax.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "03-hour.png"))
    plt.close(fig)


def fig_focal_vs_aperture(df):
    """어떤 초점거리에서 어떤 조리개를 쓰는가 — 렌즈 선택의 근거가 됩니다."""
    d = df.dropna(subset=["focal_use", "f_number"])
    if d.empty:
        return
    fig, ax = plt.subplots(figsize=(7.4, 5))
    ok = d[d["is_fail"] == 0]
    bad = d[d["is_fail"] == 1]
    ax.scatter(ok["focal_use"], ok["f_number"], s=26, c=TEAL, alpha=.75, label="keep", edgecolors="none")
    ax.scatter(bad["focal_use"], bad["f_number"], s=26, c=RED, alpha=.75, label="fail", edgecolors="none")
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xticks([14, 24, 35, 50, 85, 135, 200, 400])
    ax.set_yticks([1.4, 2, 2.8, 4, 5.6, 8, 11, 16])
    ax.get_xaxis().set_major_formatter(matplotlib.ticker.ScalarFormatter())
    ax.get_yaxis().set_major_formatter(matplotlib.ticker.ScalarFormatter())
    ax.set_xlabel("focal length (mm, 35mm eq.)")
    ax.set_ylabel("f-number")
    ax.set_title("焦点距離 × 絞り / 초점거리 × 조리개")
    ax.grid(True, color=GRID, lw=.8); ax.set_axisbelow(True)
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "04-focal-vs-aperture.png"))
    plt.close(fig)


def fig_gear(df):
    fig, axes = plt.subplots(1, 2, figsize=(11, 3.8))
    for ax, col, title, color in [(axes[0], "camera", "ボディ / 바디 / Body", BLUE),
                                  (axes[1], "lens", "レンズ / 렌즈 / Lens", TEAL)]:
        s = df[col].dropna().value_counts().head(8)
        if s.empty:
            ax.axis("off"); continue
        labels = [x if len(str(x)) <= 26 else str(x)[:25] + "…" for x in s.index]
        hbar(ax, labels, s.values, color)
        ax.set_title(title)
    fig.tight_layout()
    fig.savefig(os.path.join(OUT, "05-gear.png"))
    plt.close(fig)


def report(df):
    n = len(df)
    print()
    print("=" * 62)
    print(f"  Shutterlog EXIF report — {n} photos")
    if df["shot_at"].notna().any():
        print(f"  {df['shot_at'].min().date()}  →  {df['shot_at'].max().date()}")
    print("=" * 62)

    def top(col, fmt):
        s = df[col].dropna()
        if s.empty:
            return "—"
        v = s.value_counts().idxmax()
        c = s.value_counts().max()
        return f"{fmt(v)}  ({c}/{len(s)}, {c/len(s)*100:.0f}%)"

    print(f"  가장 많이 쓴 초점거리 : {top('focal_snap', lambda v: f'{int(v)}mm')}")
    print(f"  가장 많이 쓴 조리개   : {top('f_snap', lambda v: f'f/{v:g}')}")
    print(f"  가장 많이 쓴 ISO      : {top('iso_snap', lambda v: str(int(v)))}")
    print(f"  가장 많이 찍은 시간대 : {top('hour', lambda v: f'{int(v):02d}:00')}")

    # 손떨림 기준선 — 표본 5장 이상, 실패율 30% 미만인 가장 느린 셔터
    g = df.dropna(subset=["sh_snap"]).groupby("sh_snap")["is_fail"].agg(["mean", "size"])
    ok = g[(g["size"] >= 5) & (g["mean"] < .30)]
    print()
    if not ok.empty:
        limit = ok.index.max()
        row = g.loc[limit]
        print(f"  손떨림 기준선 : {shutter_label(limit)} 까지는 실패율 {row['mean']*100:.0f}% "
              f"(n={int(row['size'])})")
        slower = g[g.index > limit]
        if not slower.empty:
            worst = slower["mean"].idxmax()
            print(f"  그보다 느린 {shutter_label(worst)} 에서는 "
                  f"{g.loc[worst,'mean']*100:.0f}% ({int(g.loc[worst,'size'])}장)")
    else:
        print("  손떨림 기준선 : 표본이 부족합니다 (셔터 구간마다 5장 이상 필요)")

    # 초점거리별 실패율 상위
    gf = df.dropna(subset=["focal_snap"]).groupby("focal_snap")["is_fail"].agg(["mean", "size"])
    gf = gf[gf["size"] >= 5].sort_values("mean", ascending=False)
    if not gf.empty:
        k = gf.index[0]
        print(f"  실패가 잦은 초점거리 : {int(k)}mm — {gf.iloc[0]['mean']*100:.0f}% "
              f"(n={int(gf.iloc[0]['size'])})")

    print()
    print(f"  그림 5장을 저장했습니다 → {OUT}")
    print()


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("사용법: python3 exif_analysis.py <shutterlog-exif-*.csv>")
        return 1
    path = sys.argv[1]
    if not os.path.exists(path):
        print(f"파일이 없습니다: {path}")
        return 1

    os.makedirs(OUT, exist_ok=True)
    df = load(path)
    if df.empty:
        print("CSV 가 비어 있습니다.")
        return 1

    fig_distributions(df)
    fig_failure(df)
    fig_hour(df)
    fig_focal_vs_aperture(df)
    fig_gear(df)
    report(df)
    return 0


if __name__ == "__main__":
    sys.exit(main())
