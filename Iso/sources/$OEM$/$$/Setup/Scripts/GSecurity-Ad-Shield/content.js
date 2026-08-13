/**
 * GSecurity Ad Shield - YouTube content script (1.1.0).
 * Video ads: 0.7.2 safe scrub (remove ad nodes, skip, seek).
 * Home only: remove empty ad feed tiles (black holes).
 * Watch: also dismiss anti-adblock wall + unlock scroll.
 * Never reorganize feed tiles on /watch.
 */
(function () {
  if (window.__gsecYtInjected) return;
  window.__gsecYtInjected = true;

  const path = () => {
    try { return location.pathname || ""; } catch (_) { return ""; }
  };
  const isHomePage = () => {
    const p = path();
    return p === "/" || p === "";
  };
  const isWatchPage = () => {
    const p = path();
    return p === "/watch" || p.startsWith("/watch");
  };
  /* Forum / site embeds use /embed — keep player logic light and safe */
  const isEmbedPage = () => {
    const p = path();
    return p === "/embed" || p.startsWith("/embed/") || p.startsWith("/embed?");
  };

  const injectMainWorld = () => {
    try {
      const src = chrome.runtime.getURL("main-world.js");
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      (document.head || document.documentElement).appendChild(s);
      s.remove();
    } catch (_) {}
  };

  const injectCollapseCss = () => {
    if (document.getElementById("gsec-yt-css")) return;
    const style = document.createElement("style");
    style.id = "gsec-yt-css";
    style.textContent = `
      ytd-display-ad-renderer,
      ytd-ad-slot-renderer,
      ytd-promoted-video-renderer,
      ytd-promoted-sparkles-web-renderer,
      ytd-promoted-sparkles-text-search-renderer,
      ytd-banner-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-masthead-ad-renderer,
      ytd-primetime-promo-renderer,
      ytd-compact-promoted-video-renderer,
      ytd-action-companion-ad-renderer,
      ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
      ytd-search-pyv-renderer,
      ytd-movie-offer-module-renderer,
      ytd-mealbar-promo-renderer,
      ytd-enforcement-message-view-model,
      #masthead-ad,
      #player-ads,
      .video-ads,
      .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-player-overlay,
      .ytp-ad-action-interstitial,
      .ytp-ad-image-overlay,
      .ytp-ad-text-overlay,
      .ytp-ad-skip-ad-slot {
        display: none !important;
      }

      /* Home feed: collapse whole grid tile that still wraps an ad */
      ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
      ytd-rich-item-renderer:has(ytd-display-ad-renderer),
      ytd-rich-item-renderer:has(ytd-promoted-video-renderer),
      ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
      ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
      ytd-rich-item-renderer:has(ytd-banner-promo-renderer) {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        border: 0 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  /* ── 0.7.2 video/UI ad scrub (all pages, including watch) ── */
  const AD_SELECTORS = [
    "#player-ads",
    "#masthead-ad",
    "ytd-display-ad-renderer",
    "ytd-ad-slot-renderer",
    "ytd-promoted-video-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-sparkles-text-search-renderer",
    "ytd-banner-promo-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-masthead-ad-renderer",
    "ytd-compact-promoted-video-renderer",
    "ytd-search-pyv-renderer",
    "ytd-mealbar-promo-renderer",
    "ytd-enforcement-message-view-model",
    "ytd-action-companion-ad-renderer",
    "ytd-statement-banner-renderer",
    "ytd-primetime-promo-renderer",
    "ytd-movie-offer-module-renderer"
  ];

  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-modern",
    "button.ytp-ad-skip-button-modern",
    "button.ytp-ad-skip-button",
    ".ytp-ad-overlay-close-button"
  ];

  const removeEl = (el) => {
    try { el.remove(); } catch (_) {}
  };

  const scrubVideoAds = () => {
    try {
      for (const sel of AD_SELECTORS) {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.closest("#comments, ytd-comments, #description-inner, ytd-watch-metadata")) return;
          // On home: remove the grid TILE, not just the ad child (avoids black hole)
          if (isHomePage() && !isWatchPage()) {
            const tile = el.closest("ytd-rich-item-renderer");
            if (tile) {
              removeEl(tile);
              return;
            }
          }
          removeEl(el);
        });
      }
      for (const sel of SKIP_SELECTORS) {
        document.querySelectorAll(sel).forEach((btn) => {
          try { if (btn.click) btn.click(); } catch (_) {}
        });
      }
      // Fast-forward only when player is clearly in ad mode
      const player = document.querySelector(".html5-video-player.ad-showing");
      if (player) {
        const video = player.querySelector("video");
        if (video && Number.isFinite(video.duration) && video.duration > 0 && video.duration <= 120) {
          try {
            video.currentTime = Math.max(0, video.duration - 0.05);
            video.muted = true;
            video.playbackRate = 16;
            video.play().catch(() => {});
          } catch (_) {}
        }
        try { player.classList.remove("ad-showing", "ad-interrupting"); } catch (_) {}
      }
    } catch (_) {}
  };

  /* ── Anti-adblock wall (watch scroll lock) ── */
  const textLooksLikeAdblockWall = (text) => {
    const t = String(text || "").toLowerCase();
    if (!t) return false;
    const aboutAds =
      t.includes("ad blocker") ||
      t.includes("adblock") ||
      t.includes("blokiranje oglasa") ||
      t.includes("programi za blokiranje") ||
      t.includes("blokator") ||
      t.includes("allow ads") ||
      t.includes("dopusti oglašavanje") ||
      t.includes("dopusti oglasavanje") ||
      t.includes("nisu dopušteni") ||
      t.includes("nisu dopusteni");
    return aboutAds;
  };

  const unlockPageScroll = () => {
    try {
      const nodes = [
        document.documentElement,
        document.body,
        document.querySelector("ytd-app"),
        document.querySelector("#content"),
        document.querySelector("ytd-watch-flexy")
      ];
      for (const n of nodes) {
        if (!n || !n.style) continue;
        if (n.style.overflow === "hidden") n.style.overflow = "";
        if (n.style.overflowY === "hidden") n.style.overflowY = "";
      }
    } catch (_) {}
  };

  const dismissAdblockWall = () => {
    try {
      document.querySelectorAll("ytd-enforcement-message-view-model").forEach((el) => {
        const close = el.querySelector(
          "button[aria-label*='Close'], button[aria-label*='Zatvori'], " +
          ".yt-spec-button-shape-next--icon-only, #dismiss-button"
        );
        if (close) {
          try { close.click(); } catch (_) {}
        }
        removeEl(el);
      });

      document.querySelectorAll("tp-yt-paper-dialog, ytd-modal-with-title-and-button-renderer").forEach((dialog) => {
        if (!textLooksLikeAdblockWall(dialog.textContent)) return;
        const closeBtn = dialog.querySelector(
          "#close-button, #dismiss-button, button[aria-label*='Close'], " +
          "button[aria-label*='Zatvori'], .yt-spec-button-shape-next--icon-only"
        );
        if (closeBtn) {
          try { closeBtn.click(); } catch (_) {}
        }
        removeEl(dialog);
      });

      document.querySelectorAll("tp-yt-iron-overlay-backdrop.opened").forEach(removeEl);
      unlockPageScroll();
    } catch (_) {}
  };

  /* ── HOME ONLY: black-hole ad tiles ── */
  const emptyStrikes = new WeakMap();

  const isRealVideoTile = (el) => {
    if (el.querySelector("a#video-title-link[href], a#video-title[href]")) return true;
    if (el.querySelector("#video-title.ytd-rich-grid-media")) return true;
    if (el.querySelector("ytd-rich-grid-media, ytd-rich-grid-slim-media")) return true;
    if (el.querySelector("ytd-thumbnail img[src], yt-image img[src], img.yt-core-image[src]")) return true;
    if (el.querySelector("ytd-thumbnail-overlay-time-status-renderer")) return true;
    if (el.querySelector("ytd-video-meta-block, #channel-name, ytd-channel-name")) return true;
    if (el.querySelector("ytd-menu-renderer")) return true;
    return false;
  };

  const homeRoots = () => {
    const roots = [];
    document.querySelectorAll("ytd-browse").forEach((browse) => {
      const sub = (browse.getAttribute("page-subtype") || "").toLowerCase();
      if (!(sub === "home" || sub === "" || sub === "featured")) return;
      try {
        const style = window.getComputedStyle(browse);
        if (style.display === "none" || style.visibility === "hidden") return;
      } catch (_) {}
      roots.push(browse);
    });
    if (roots.length === 0) {
      const grid = document.querySelector("ytd-rich-grid-renderer");
      if (grid) roots.push(grid);
    }
    return roots;
  };

  const reorganizeHomeAdTiles = () => {
    if (!isHomePage() || isWatchPage()) return;
    try {
      const roots = homeRoots();
      const marked =
        "ytd-rich-item-renderer:has(ytd-ad-slot-renderer), " +
        "ytd-rich-item-renderer:has(ytd-display-ad-renderer), " +
        "ytd-rich-item-renderer:has(ytd-promoted-video-renderer), " +
        "ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer), " +
        "ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer), " +
        "ytd-rich-item-renderer:has(ytd-banner-promo-renderer)";

      for (const root of roots) {
        // 1) Tiles that still contain ad markers
        root.querySelectorAll(marked).forEach(removeEl);

        // 2) Residual black holes: ad already stripped, empty shell remains
        root.querySelectorAll("ytd-rich-item-renderer").forEach((el) => {
          try {
            if (!el.isConnected) return;
            if (isRealVideoTile(el)) {
              emptyStrikes.delete(el);
              return;
            }

            const r = el.getBoundingClientRect();
            // Full-size home cards only (ignore chrome / tiny nodes)
            if (r.width < 160 || r.height < 90) {
              emptyStrikes.delete(el);
              return;
            }

            const text = (el.textContent || "").replace(/\s+/g, " ").trim();
            // Real cards almost always have title/channel text
            if (text.length > 20) {
              emptyStrikes.delete(el);
              return;
            }

            const n = (emptyStrikes.get(el) || 0) + 1;
            emptyStrikes.set(el, n);
            // 2 ticks (~2s) still empty => remove black hole
            if (n >= 2) removeEl(el);
          } catch (_) {}
        });
      }
    } catch (_) {}
  };

  const tick = () => {
    // Embeds (forums, blogs): only skip in-player ads; never reorganize DOM around the player
    if (isEmbedPage()) {
      scrubVideoAds();
      return;
    }
    // Home: kill black-hole tiles BEFORE scrub removes ad children
    if (isHomePage() && !isWatchPage()) reorganizeHomeAdTiles();
    scrubVideoAds();
    dismissAdblockWall();
  };

  injectMainWorld();
  // Full UI collapse CSS is for youtube.com chrome, not minimal embed players
  if (!isEmbedPage()) injectCollapseCss();
  tick();
  setInterval(tick, isEmbedPage() ? 1500 : 1000);
})();
