#!/usr/bin/env Rscript
# =====================================================================
# exif_analysis.R — 브라우저에서 내보낸 CSV 로 촬영 습관을 통계적으로 봅니다.
#
# Python 쪽(exif_analysis.py)이 "분포를 그려서 보는" 역할이라면,
# 이쪽은 "그 차이가 우연인지 아닌지 검정하는" 역할입니다.
#   · 셔터 속도가 느려질수록 실패 확률이 정말 올라가는가 → 로지스틱 회귀
#   · 몇 초부터 위험해지는가                             → 예측 확률 곡선
#   · 초점거리·조리개·ISO 를 함께 넣으면 무엇이 남는가   → 다변량 모형
#
# 쓰는 법
#   install.packages(c("tidyverse", "scales"))
#   Rscript exif_analysis.R shutterlog-exif-20260815.csv
#
# 나오는 것
#   analysis/output/R-*.png  — 그림 3장
#   표준출력                 — 모형 요약
# =====================================================================

suppressPackageStartupMessages({
  library(tidyverse)
  library(scales)
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 1) {
  cat("사용법: Rscript exif_analysis.R <shutterlog-exif-*.csv>\n")
  quit(status = 1)
}
csv_path <- args[1]
if (!file.exists(csv_path)) {
  cat(sprintf("파일이 없습니다: %s\n", csv_path))
  quit(status = 1)
}

out_dir <- file.path(dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(FALSE), value = TRUE)[1]))), "output")
if (is.na(out_dir) || !nzchar(out_dir)) out_dir <- "output"
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

# --- 사이트와 같은 팔레트 ---------------------------------------------
BLUE  <- "#2c98f0"; TEAL <- "#2fa499"; AMBER <- "#f9bf3f"; RED <- "#ec5453"

theme_shutterlog <- function() {
  theme_minimal(base_size = 11) +
    theme(
      plot.title    = element_text(face = "bold", size = 13),
      plot.subtitle = element_text(colour = "grey40", size = 10),
      panel.grid.minor = element_blank(),
      panel.grid.major = element_line(colour = "grey90"),
      axis.title    = element_text(colour = "grey30")
    )
}

# --- 표준 스톱으로 붙이기 ---------------------------------------------
SH_STOPS    <- c(1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60,
                 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30)
FOCAL_STOPS <- c(14, 16, 20, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400, 600)
F_STOPS     <- c(1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22)

snap_to <- function(v, stops) {
  vapply(v, function(x) {
    if (is.na(x) || x <= 0) return(NA_real_)
    stops[which.min(abs(log(x) - log(stops)))]
  }, numeric(1))
}

shutter_label <- function(s) {
  ifelse(is.na(s), NA_character_,
         ifelse(s >= 1, sprintf("%gs", s), sprintf("1/%d s", round(1 / s))))
}

# --- 읽기 --------------------------------------------------------------
df <- read_csv(csv_path, show_col_types = FALSE) %>%
  mutate(
    shot_at    = suppressWarnings(as.POSIXct(shot_at, tz = "UTC")),
    focal_use  = coalesce(focal35_mm, focal_mm),
    focal_snap = snap_to(focal_use, FOCAL_STOPS),
    f_snap     = snap_to(f_number, F_STOPS),
    sh_snap    = snap_to(shutter_s, SH_STOPS),
    hour       = as.integer(format(shot_at, "%H")),
    # 여러 CSV 를 합쳐 쓸 수 있으므로 실패 기준을 여기서 다시 잡습니다
    is_fail    = as.integer(sharpness <= quantile(sharpness, .25, na.rm = TRUE))
  )

cat("\n")
cat(strrep("=", 62), "\n")
cat(sprintf("  Shutterlog — %d photos\n", nrow(df)))
if (any(!is.na(df$shot_at))) {
  cat(sprintf("  %s  →  %s\n",
              format(min(df$shot_at, na.rm = TRUE), "%Y-%m-%d"),
              format(max(df$shot_at, na.rm = TRUE), "%Y-%m-%d")))
}
cat(strrep("=", 62), "\n\n")

# =====================================================================
# 1. 셔터 속도별 실패율 — 표본 수를 점 크기로 함께 보여 줍니다
# =====================================================================
rate_sh <- df %>%
  filter(!is.na(sh_snap)) %>%
  group_by(sh_snap) %>%
  summarise(n = n(), fail = mean(is_fail), .groups = "drop") %>%
  filter(n >= 3) %>%
  mutate(label = shutter_label(sh_snap))

if (nrow(rate_sh) > 0) {
  p1 <- ggplot(rate_sh, aes(x = reorder(label, sh_snap), y = fail)) +
    geom_col(aes(fill = fail), width = .68) +
    geom_text(aes(label = sprintf("%.0f%%  (n=%d)", fail * 100, n)),
              hjust = -0.1, size = 3, colour = "grey35") +
    scale_fill_gradientn(colours = c(TEAL, AMBER, RED), limits = c(0, 1), guide = "none") +
    scale_y_continuous(labels = percent_format(accuracy = 1), limits = c(0, 1.15)) +
    coord_flip() +
    labs(title = "シャッター速度と失敗率 / 셔터 속도와 실패율",
         subtitle = "シャープネス下位 25% を「失敗」とした場合 · 3枚未満の区間は除外",
         x = NULL, y = NULL) +
    theme_shutterlog()
  ggsave(file.path(out_dir, "R-01-failure-by-shutter.png"), p1, width = 8, height = 5, dpi = 130)
}

# =====================================================================
# 2. 로지스틱 회귀 — 셔터가 느려지면 실패 확률이 오르는가
#    설명변수는 log2(1/shutter) = "스톱" 입니다. 1 늘어나면 한 스톱 빨라짐.
# =====================================================================
mdl_df <- df %>%
  filter(!is.na(shutter_s), shutter_s > 0, !is.na(is_fail)) %>%
  mutate(stops = log2(1 / shutter_s))

if (nrow(mdl_df) >= 25 && length(unique(mdl_df$is_fail)) == 2) {
  m1 <- glm(is_fail ~ stops, data = mdl_df, family = binomial())
  cat("── 로지스틱 회귀: is_fail ~ log2(1/shutter) ──────────────\n")
  print(summary(m1)$coefficients)
  or <- exp(coef(m1)[["stops"]])
  cat(sprintf("\n  오즈비 %.3f — 셔터가 한 스톱 빨라질 때마다 실패 오즈가 %.0f%% %s\n",
              or, abs(1 - or) * 100, ifelse(or < 1, "줄어듭니다", "늘어납니다")))

  # 실패 확률 50% 가 되는 셔터 속도 (있다면)
  b0 <- coef(m1)[[1]]; b1 <- coef(m1)[["stops"]]
  if (abs(b1) > 1e-9) {
    s50 <- 1 / 2^(-b0 / b1)
    if (is.finite(s50) && s50 > 0 && s50 < 60) {
      cat(sprintf("  실패 확률 50%% 지점 : 약 %s\n", shutter_label(s50)))
    }
  }
  cat("\n")

  grid <- tibble(stops = seq(min(mdl_df$stops), max(mdl_df$stops), length.out = 200))
  grid$p <- predict(m1, newdata = grid, type = "response")
  grid$shutter <- 1 / 2^grid$stops

  p2 <- ggplot() +
    geom_jitter(data = mdl_df, aes(x = shutter, y = is_fail),
                height = .035, width = 0, alpha = .35, colour = BLUE, size = 1.6) +
    geom_line(data = grid, aes(x = shutter, y = p), colour = RED, linewidth = 1.1) +
    scale_x_log10(breaks = c(1/1000, 1/250, 1/60, 1/15, 1/4, 1),
                  labels = function(x) shutter_label(x)) +
    scale_y_continuous(labels = percent_format(accuracy = 1)) +
    labs(title = "手ブレの限界 / 손떨림의 한계",
         subtitle = "点＝実際の写真、線＝ロジスティック回帰による失敗確率",
         x = "shutter speed", y = "P(fail)") +
    theme_shutterlog()
  ggsave(file.path(out_dir, "R-02-handshake-limit.png"), p2, width = 8, height = 5, dpi = 130)

  # 다변량 — 초점거리·ISO 를 함께 넣으면 셔터의 효과가 남는가
  mv <- mdl_df %>% filter(!is.na(focal_use), !is.na(iso), iso > 0, focal_use > 0)
  if (nrow(mv) >= 40) {
    m2 <- glm(is_fail ~ stops + log2(focal_use) + log2(iso), data = mv, family = binomial())
    cat("── 다변량: is_fail ~ stops + log2(focal) + log2(iso) ─────\n")
    print(summary(m2)$coefficients)
    cat("\n  ※ 望遠ほど / ISO が高いほどブレやすい、という直感が\n")
    cat("     数値として残るかどうかを見ます。有意でなければ\n")
    cat("     「シャッター速度だけで説明できている」ということです。\n\n")
  }
} else {
  cat("── 회귀는 건너뜁니다 (표본 25장 이상, 성공/실패가 모두 있어야 합니다) ──\n\n")
}

# =====================================================================
# 3. 초점거리 × 조리개 — 어떤 렌즈를 실제로 쓰고 있는가
# =====================================================================
sc <- df %>% filter(!is.na(focal_use), !is.na(f_number))
if (nrow(sc) > 0) {
  p3 <- ggplot(sc, aes(x = focal_use, y = f_number, colour = factor(is_fail))) +
    geom_point(alpha = .75, size = 2.1) +
    scale_colour_manual(values = c("0" = TEAL, "1" = RED),
                        labels = c("0" = "keep", "1" = "fail"), name = NULL) +
    scale_x_log10(breaks = c(14, 24, 35, 50, 85, 135, 200, 400)) +
    scale_y_log10(breaks = c(1.4, 2, 2.8, 4, 5.6, 8, 11, 16)) +
    labs(title = "焦点距離 × 絞り / 초점거리 × 조리개",
         subtitle = "自分がどのレンズをどう使っているかが一枚で見えます",
         x = "focal length (mm, 35mm eq.)", y = "f-number") +
    theme_shutterlog()
  ggsave(file.path(out_dir, "R-03-focal-vs-aperture.png"), p3, width = 7.5, height = 5.5, dpi = 130)
}

cat(sprintf("그림을 저장했습니다 → %s\n\n", out_dir))
