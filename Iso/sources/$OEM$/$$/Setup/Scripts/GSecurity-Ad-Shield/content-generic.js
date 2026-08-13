/**
 * GSecurity Ad Shield — Generic ad removal for all other sites.
 * Runs at document_idle on sites not covered by the YouTube or site-specific scripts.
 * Protects YouTube / youtube-nocookie embeds used on forums and blogs.
 */
(function () {
  if (window.__gsecGenericInjected) return;
  window.__gsecGenericInjected = true;

  const whitelist = [
    "apple.com",
    "citibank.com",
    "ebay.com",
    "yahoo.com",
    "aliexpress.com",
    "wolt.com",
    "woltapp.com",
    "discord.com",
    "discordapp.com"
  ];

  const isWhitelistedHost = (h) => {
    const host = String(h || "").toLowerCase();
    return whitelist.some((d) => host === d || host.endsWith(`.${d}`));
  };

  if (isWhitelistedHost(location.hostname)) return;

  const YT_EMBED_RE = /(?:youtube(?:-nocookie)?\.com|youtu\.be)/i;
  /* Adult ad iframes / pop creatives — hide these, not main video players */
  const ADULT_AD_FRAME_RE =
    /exoclick|juicyads|trafficjunky|popads|popcash|propellerads|adsterra|hilltopads|clickadu|tsyndicate|realsrv|magsrv|exosrv|doublepimp|ero-advertising|trafficfactory|plugrush|awempire|adultadworld|sexad\.net|livejasmin\.com\/|stripchat\.com\/|chaturbate\.com\/(landing|promo)|ads\.(pornhub|xvideos|xnxx|youporn|redtube)/i;

  const isYouTubeEmbedNode = (el) => {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.tagName === "IFRAME" || el.tagName === "VIDEO" || el.tagName === "EMBED") {
        const src =
          el.getAttribute("src") ||
          el.src ||
          el.getAttribute("data-src") ||
          el.getAttribute("data-lazy-src") ||
          "";
        if (YT_EMBED_RE.test(src)) return true;
      }
      /* Lite YouTube / WP embeds / common forum players */
      if (
        el.classList &&
        (el.classList.contains("lite-youtube") ||
          el.classList.contains("youtube-player") ||
          el.classList.contains("wp-block-embed-youtube") ||
          el.classList.contains("rll-youtube-player"))
      ) {
        return true;
      }
      /* Never hide a wrapper that contains a YouTube player embed */
      if (
        el.querySelector &&
        el.querySelector(
          'iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"], iframe[src*="youtu.be"], iframe[data-src*="youtube"], iframe[data-src*="youtu.be"], .lite-youtube, .wp-block-embed-youtube'
        )
      ) {
        return true;
      }
      if (
        el.closest &&
        el.closest(
          'iframe[src*="youtube"], iframe[src*="youtu.be"], iframe[src*="youtube-nocookie"], .yt-lazy, .youtube-player, .wp-block-embed-youtube, .wp-block-embed.is-provider-youtube, .fluid-width-video-wrapper, .lite-youtube, [data-youtube-id]'
        )
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  };

  const isAdultAdFrame = (el) => {
    if (!el || el.nodeType !== 1) return false;
    try {
      const src =
        el.getAttribute("src") ||
        el.src ||
        el.getAttribute("data-src") ||
        el.getAttribute("href") ||
        "";
      return ADULT_AD_FRAME_RE.test(src);
    } catch (_) {
      return false;
    }
  };

  /* ── Inject main-world.js for fetch/XHR interception ── */
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

  const GENERIC_AD_SELECTORS = [
    /* ── Cosmetic filter: tester + common ad-box class names ── */
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

    /* ── Core Google / programmatic ad selectors ── */
    "ins.adsbygoogle",
    'ins[data-ad-client]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="googletagmanager"]',
    'iframe[id^="google_ads"]',
    'iframe[id^="aswift"]',
    '[id^="google_ads"]',
    '[id^="aswift_"]',
    '[id^="yandex_rtb"]',
    '[id*="yandex_rtb"]',
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
    ".ad-unit",
    'div[id^="taboola"]',
    'div[id^="outbrain"]',
    'div[class^="taboola"]',
    'div[class^="outbrain"]',
    ".video-ad-overlay",
    ".preroll-ad",
    ".midroll-ad",

    /* ── Additional class-based ad selectors ── */
    '[class^="ad-placement"]',
    ".ad-zone",
    ".ad-area",
    ".ad-block",
    ".ad-box",
    ".ad-frame",
    ".ad-leaderboard",
    ".ad-sidebar",
    ".ad-skyscraper",
    ".ad-rectangle",
    ".ad-interstitial",
    ".ad-overlay",
    ".ad-popup",
    ".ad-modal",

    /* ── iframe / embed ad selectors (NOT YouTube) ── */
    'iframe[src*="doubleclick"][width]',
    'iframe[src*="googlesyndication"][width]',

    /* ── Third-party ad network widgets ── */
    'div[id^="zergnet"]',
    'div[id^="revcontent"]',
    'div[id^="mgid"]',
    'div[class^="mgid"]',
    'a[href*="doubleclick.net"]',
    'a[href*="googleadservices"]',

    /* ── ARIA-labelled ads ── */
    'div[aria-label="Advertisement"]',
    'div[aria-label="advertisement"]',

    /* ── DuckDuckGo ad selectors ── */
    ".result--ad",
    ".is-ad",
    '[data-testid="ad"]',
    ".badge--ad",
    ".header-aside",

    /* ── Google search ad selectors ── */
    "#tads",
    "#tadsb",
    "#bottomads",
    ".commercial-unit-desktop-top",
    "div[data-text-ad]",

    /* ── Bing search ad selectors ── */
    ".b_ad",
    ".b_adSlug",
    "li.b_ad"
  ];

  /* ── CSS injection — hide ad elements before DOM scrubber runs ── */
  const injectAdHidingCSS = () => {
    try {
      const style = document.createElement("style");
      style.id = "gsec-ad-hide";
      style.textContent = GENERIC_AD_SELECTORS.map(
        (s) =>
          `${s}:not([data-gsec-bait]):not(iframe[src*="youtube"]):not(iframe[src*="youtu.be"]):not(iframe[src*="youtube-nocookie"]) { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }`
      ).join("\n");
      (document.head || document.documentElement).appendChild(style);
    } catch (_) {}
  };

  const scrubGenericAds = () => {
    for (const sel of GENERIC_AD_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (!el || !el.parentElement) return;
        /* Skip our own bait element used for anti-adblock countermeasures */
        if (el.getAttribute("data-gsec-bait")) return;
        if (isYouTubeEmbedNode(el)) return;
        /* Hide instead of remove to avoid breaking page scripts that reference these elements */
        if (!el.getAttribute("data-gsec-hidden")) {
          el.setAttribute("data-gsec-hidden", "1");
          el.style.cssText =
            "display:none!important;height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;padding:0!important;margin:0!important;border:0!important;";
        }
      });
    }
  };

  injectAdHidingCSS();
  injectMainWorld();

  /* ── Block ad-related media resources (banner images, Flash, iframes with ad paths) ── */
  /* Intentionally does not match youtube.com / youtube-nocookie.com / youtu.be URLs */
  const adPathRegex =
    /(?:\/(?:ads?|banners?|advert|promo|sponsor|tracking|affiliate|click|pop(?:up|under))[\w.-]*\/)|(?:[\/?&_-](?:ad|ads|advert|banner|sponsor|promo|tracking|click|popup)[\w.-]*\.(?:gif|png|jpg|jpeg|webp|svg|swf|html?))|(?:pr_advertising_ads_banner)/i;

  const scrubAdMedia = () => {
    document.querySelectorAll("img[src], embed[src], object[data], iframe[src], iframe[data-src], a[href]").forEach((el) => {
      if (el.getAttribute("data-gsec-bait")) return;
      if (el.getAttribute("data-gsec-hidden")) return;
      if (isYouTubeEmbedNode(el)) return;
      const src =
        el.src ||
        el.getAttribute("data") ||
        el.getAttribute("data-src") ||
        el.getAttribute("href") ||
        "";
      if (src && YT_EMBED_RE.test(src)) return;
      /* Hide adult ad creatives / pop networks — not main video players */
      if (src && (ADULT_AD_FRAME_RE.test(src) || isAdultAdFrame(el))) {
        el.setAttribute("data-gsec-hidden", "1");
        el.style.cssText =
          "display:none!important;height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;";
        return;
      }
      if (src && adPathRegex.test(src)) {
        el.setAttribute("data-gsec-hidden", "1");
        el.style.cssText =
          "display:none!important;height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;";
      }
    });
    /* Also hide <object>/<embed> Flash elements (commonly tested by adblock-tester.com) */
    document
      .querySelectorAll(
        'object[type*="flash"], embed[type*="flash"], object[data*=".swf"], embed[src*=".swf"], object[data*="pr_advertising"], embed[src*="pr_advertising"]'
      )
      .forEach((el) => {
        if (isYouTubeEmbedNode(el)) return;
        if (!el.getAttribute("data-gsec-hidden")) {
          el.setAttribute("data-gsec-hidden", "1");
          el.style.cssText = "display:none!important;height:0!important;visibility:hidden!important;";
        }
      });
  };

  /* ── Anti-adblock countermeasures ── */
  const defeatAntiAdblock = () => {
    // Create a fake ad element that anti-adblock scripts look for
    // If it's hidden/removed, they know an adblocker is active
    const bait = document.createElement("div");
    bait.className = "adsbox ad-placement pub_300x250";
    bait.setAttribute("data-ad", "true");
    bait.setAttribute("data-gsec-bait", "1");
    bait.style.cssText = "position:absolute!important;left:-9999px!important;top:-9999px!important;width:1px!important;height:1px!important;opacity:0.01!important;pointer-events:none!important;";
    bait.innerHTML = "&nbsp;";
    (document.body || document.documentElement).appendChild(bait);

    // Prevent anti-adblock overlays from blocking page content
    const antiAdblockSelectors = [
      '[class*="adblock-notice"]',
      '[class*="adblock-overlay"]',
      '[class*="adblock-modal"]',
      '[class*="adblock-warning"]',
      '[class*="adb-overlay"]',
      '[id*="adblock-notice"]',
      '[id*="adblock-overlay"]',
      '[id*="adblock_modal"]',
      ".fc-ab-root",
      ".tp-modal",
      ".tp-backdrop",
      "#tp-container"
    ];
    for (const sel of antiAdblockSelectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Restore body scroll if anti-adblock locked it
    if (document.body) {
      const bodyStyle = getComputedStyle(document.body);
      if (bodyStyle.overflow === "hidden" || bodyStyle.position === "fixed") {
        // Only restore if there's an anti-adblock overlay present
        const hasOverlay = document.querySelector('[class*="adblock"], [class*="adb-"], .fc-ab-root, .tp-modal');
        if (hasOverlay) {
          document.body.style.overflow = "";
          document.body.style.position = "";
        }
      }
    }
  };

  scrubGenericAds();
  scrubAdMedia();

  if (document.body) {
    defeatAntiAdblock();
  } else {
    document.addEventListener("DOMContentLoaded", defeatAntiAdblock);
  }

  setInterval(function() { scrubGenericAds(); scrubAdMedia(); }, 1500);

  const observer = new MutationObserver(function() { scrubGenericAds(); scrubAdMedia(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
