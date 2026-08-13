/**
 * GSecurity Ad Shield — Early cosmetic filter (runs at document_start).
 * Hides known ad elements before they render using multiple strategies.
 * Never touches YouTube embed frames or hosts (forum embeds stay intact).
 */
(function () {
  if (window.__gsecCosmeticInjected) return;
  window.__gsecCosmeticInjected = true;

  const whitelist = [
    "apple.com",
    "citibank.com",
    "ebay.com",
    "yahoo.com",
    "aliexpress.com",
    "wolt.com",
    "woltapp.com",
    "discord.com",
    "discordapp.com",
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be"
  ];

  const isWhitelistedHost = (h) => {
    const host = String(h || "").toLowerCase();
    return whitelist.some((d) => host === d || host.endsWith(`.${d}`));
  };

  if (isWhitelistedHost(location.hostname)) return;

  /* Early main-world hooks so fetch/XHR baits on tester sites are caught ASAP */
  try {
    if (!window.__gsecMainWorldLink) {
      window.__gsecMainWorldLink = true;
      const src = chrome.runtime.getURL("main-world.js");
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      (document.documentElement || document.head || document).appendChild(s);
      s.remove();
    }
  } catch (_) {}

  /* Cosmetic baits logged from popular testers (d3ward/turtlecute/adblock-tester/etc.) */
  const COSMETIC_SELECTORS = [
    /* ── d3ward / turtlecute cosmetic tests ── */
    ".adsbox",
    ".adbox",
    ".ad-box",
    ".adbox-wrapper",
    ".banner_ads",
    ".banner-ads",
    ".textads",
    ".text-ads",
    ".adbox.banner_ads.adsbox",
    ".adSocial",
    ".ADBox",
    ".AdBox",
    ".ad-unit",
    ".afs_ads",
    ".ad-zone",
    ".ad-space",
    /* ── adblock-tester.com + network units ── */
    "ins.adsbygoogle",
    'ins[data-ad-client]',
    'ins[data-ad-slot]',
    '[id^="google_ads"]',
    '[id^="aswift_"]',
    '[id^="yandex_rtb"]',
    '[id*="yandex_rtb"]',
    "#adsense",
    "#ad_div",
    "#ad_ctd",
    "#test-ad",
    "#ADSLOT_1",
    "#adb_test",
    "#adb_test_r",
    '[class^="ad-slot"]',
    '[class^="ad-banner"]',
    '[class^="ad-container"]',
    '[class^="ad-wrapper"]',
    '[data-adunit]',
    '[data-ad-slot]',
    '[data-ad-client]',
    '[data-google-query-id]',
    ".sponsored-content",
    ".promoted",
    ".ad-banner",
    ".ad-container",
    ".ad-wrapper",
    ".native-ad",
    ".ad-zone",
    ".ad-area",
    ".ad-block",
    ".ad-frame",
    ".ad-leaderboard",
    ".ad-sidebar",
    ".ad-skyscraper",
    ".ad-rectangle",
    ".ad-interstitial",
    ".ad-overlay",
    ".ad-popup",
    ".ad-modal",
    /* ── Common test / network containers ── */
    'div[id^="taboola"]',
    'div[id^="outbrain"]',
    'div[class*="adsbygoogle"]',
    'iframe[id^="google_ads"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="adservice"]'
  ];

  const YT_EMBED_RE = /(?:youtube(?:-nocookie)?\.com|youtu\.be)/i;

  const isYouTubeEmbedNode = (el) => {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (
        el.closest &&
        el.closest(
          'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="youtube-nocookie"], .lite-youtube, .wp-block-embed-youtube, [data-youtube-id], .youtube-player'
        )
      ) {
        return true;
      }
      if (el.tagName === "IFRAME" || el.tagName === "VIDEO") {
        const src =
          el.getAttribute("src") ||
          el.src ||
          el.getAttribute("data-src") ||
          el.getAttribute("data-lazy-src") ||
          "";
        if (YT_EMBED_RE.test(src)) return true;
      }
      if (
        el.classList &&
        (el.classList.contains("lite-youtube") ||
          el.classList.contains("wp-block-embed-youtube") ||
          el.classList.contains("youtube-player"))
      ) {
        return true;
      }
      /* Preserve wrappers that only host a YouTube embed */
      if (
        el.querySelector &&
        el.querySelector(
          'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="youtube-nocookie"], iframe[data-src*="youtube"], .lite-youtube, .wp-block-embed-youtube'
        )
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  };

  const hideRule =
    ":not([data-gsec-bait]):not(iframe[src*='youtube']):not(iframe[src*='youtu.be']):not(iframe[src*='youtube-nocookie']) { display: none !important; visibility: hidden !important; height: 0 !important; max-height: 0 !important; min-height: 0 !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; border: 0 !important; font-size: 0 !important; line-height: 0 !important; }";

  /* Strategy 1: Inject <style> element into page */
  const injectStyle = () => {
    if (document.getElementById("gsec-cosmetic-early")) return;
    const style = document.createElement("style");
    style.id = "gsec-cosmetic-early";
    style.textContent = COSMETIC_SELECTORS.map((s) => s + hideRule).join("\n");
    (document.head || document.documentElement).appendChild(style);
  };

  injectStyle();

  /* Re-inject when head becomes available */
  if (!document.head) {
    const obs = new MutationObserver(() => {
      if (document.head) {
        obs.disconnect();
        const existing = document.getElementById("gsec-cosmetic-early");
        if (existing && existing.parentNode !== document.head) {
          existing.remove();
          injectStyle();
        }
      }
    });
    obs.observe(document.documentElement, { childList: true });
  }

  /* Strategy 2: Actively collapse elements via inline styles + attribute */
  const collapseElements = () => {
    for (const sel of COSMETIC_SELECTORS) {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          if (el.getAttribute("data-gsec-hidden")) return;
          if (el.getAttribute("data-gsec-bait")) return;
          if (isYouTubeEmbedNode(el)) return;
          el.setAttribute("data-gsec-hidden", "1");
          el.style.cssText =
            "display:none!important;height:0!important;max-height:0!important;min-height:0!important;overflow:hidden!important;visibility:hidden!important;padding:0!important;margin:0!important;border:0!important;opacity:0!important;pointer-events:none!important;position:absolute!important;";
        });
      } catch (_) {}
    }
  };

  /* Strategy 3: MutationObserver to catch elements as they're added */
  const observeAndHide = () => {
    collapseElements();
    const observer = new MutationObserver(collapseElements);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeAndHide);
  } else {
    observeAndHide();
  }

  /* Run collapse at multiple intervals to ensure coverage (testers inject dynamically) */
  setTimeout(collapseElements, 0);
  setTimeout(collapseElements, 50);
  setTimeout(collapseElements, 150);
  setTimeout(collapseElements, 300);
  setTimeout(collapseElements, 450);
  setTimeout(collapseElements, 1000);
  setTimeout(collapseElements, 2000);
})();
