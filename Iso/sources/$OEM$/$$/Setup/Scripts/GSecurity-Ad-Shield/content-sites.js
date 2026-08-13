/**
 * GSecurity Ad Shield — Site-specific ad removal.
 * Covers Reddit, Facebook, Twitter/X, Instagram, LinkedIn, Twitch, TikTok,
 * and major news/content sites.
 */
(function () {
  if (window.__gsecSitesInjected) return;
  window.__gsecSitesInjected = true;

  const host = location.hostname.toLowerCase();

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

  /* ====================================================================
   *  REDDIT
   * ==================================================================== */
  const injectRedditCss = () => {
    if (document.getElementById("gsec-reddit-css")) return;
    const style = document.createElement("style");
    style.id = "gsec-reddit-css";
    style.textContent = `
      /* New Reddit (shreddit) promoted posts */
      shreddit-ad-post,
      [data-testid="ad-post"],
      [data-testid="promoted-post"],
      article:has([data-click-id="promoted"]),
      div[data-promoted="true"],
      .promotedlink,
      faceplate-tracker[source="ad"],
      faceplate-tracker[noun="ad"],

      /* Old Reddit */
      .promoted,
      .sponsorshipbox,
      .sponsor-logo,
      #ad-frame,
      #ad_main,
      .ad-container,

      /* New Reddit sidebar ads */
      [data-testid="sidebar-ad"],
      [data-testid="subreddit-sidebar-ad"],
      .sidebar-ad,
      div[class*="promotedlink"],

      /* Reddit premium upsell banners */
      .premium-banner-outer,
      [data-testid="premium-upsell"],
      shreddit-experience-tree[bundlename*="ad"],
      shreddit-experience-tree[bundlename*="Ad"],

      /* Reddit feed ad containers */
      div[data-before*="t3_"][data-fullname]:has(a[data-click-id="promoted"]),
      .thing.promoted,
      .thing.stickied.promotedlink {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const scrubReddit = () => {
    const selectors = [
      'shreddit-ad-post',
      '[data-testid="ad-post"]',
      '[data-testid="promoted-post"]',
      'div[data-promoted="true"]',
      'a[data-click-id="promoted"]',
      '.promotedlink',
      '.promoted',
      '.sponsorshipbox',
      '.sponsor-logo',
      '#ad-frame',
      '#ad_main',
      '[data-testid="sidebar-ad"]',
      '[data-testid="subreddit-sidebar-ad"]',
      'faceplate-tracker[source="ad"]',
      'faceplate-tracker[noun="ad"]',
      'shreddit-experience-tree[bundlename*="ad"]',
      'shreddit-experience-tree[bundlename*="Ad"]',
      '.premium-banner-outer',
      '[data-testid="premium-upsell"]'
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // Walk feed posts and remove ones marked "promoted"
    document.querySelectorAll('article, [data-testid="post-container"], .thing').forEach((post) => {
      // Check for "promoted" badge text
      const badges = post.querySelectorAll(
        'span, faceplate-tracker, [slot="credit-bar"], .tagline'
      );
      for (const badge of badges) {
        const text = (badge.textContent || "").trim().toLowerCase();
        if (text === "promoted" || text === "sponsored") {
          post.remove();
          break;
        }
      }
    });

    // New Reddit (shreddit) — posts inside shadow DOM
    document.querySelectorAll("shreddit-post").forEach((post) => {
      if (
        post.hasAttribute("is-promoted") ||
        post.getAttribute("post-type") === "promoted"
      ) {
        post.remove();
      }
    });
  };

  /* ====================================================================
   *  FACEBOOK
   * ==================================================================== */
  const scrubFacebook = () => {
    document.querySelectorAll('div[role="article"], div[role="feed"] > div').forEach((article) => {
      const text = (article.textContent || "").toLowerCase();
      if (/\bsponsored\b/.test(text)) {
        // Verify it's actually a "Sponsored" label, not just the word in content
        const links = article.querySelectorAll('a[href*="ads/about"], a[aria-label*="Sponsored"]');
        const spans = article.querySelectorAll("span");
        let isAd = links.length > 0;
        if (!isAd) {
          for (const span of spans) {
            const st = (span.textContent || "").trim().toLowerCase();
            if (st === "sponsored") {
              isAd = true;
              break;
            }
          }
        }
        if (isAd) article.style.display = "none";
      }
    });
  };

  /* ====================================================================
   *  TWITTER / X
   * ==================================================================== */
  const scrubTwitter = () => {
    document.querySelectorAll('article, [data-testid="placementTracking"]').forEach((el) => {
      const text = (el.textContent || "").toLowerCase();
      if (
        /\bpromoted\b/.test(text) ||
        /\bad\s*·/.test(text) ||
        /\badvertisement\b/.test(text) ||
        el.matches('[data-testid="placementTracking"]')
      ) {
        el.style.display = "none";
      }
    });
    // "Who to follow" promoted suggestions
    document.querySelectorAll('[data-testid="UserCell"]').forEach((cell) => {
      if (/promoted/i.test(cell.textContent || "")) cell.style.display = "none";
    });
  };

  /* ====================================================================
   *  INSTAGRAM
   * ==================================================================== */
  const scrubInstagram = () => {
    document.querySelectorAll("article").forEach((a) => {
      if (/\bsponsored\b/i.test(a.textContent || "")) {
        a.style.display = "none";
      }
    });
    // Reels ads
    document.querySelectorAll('[data-testid="reel-ad"]').forEach((el) => el.remove());
  };

  /* ====================================================================
   *  LINKEDIN
   * ==================================================================== */
  const scrubLinkedIn = () => {
    document.querySelectorAll(
      '.feed-shared-update-v2, [data-ad-banner-id], [data-is-sponsored="true"]'
    ).forEach((el) => {
      if (/promoted|sponsored/i.test(el.textContent || "")) el.remove();
    });
    document.querySelectorAll(".ad-banner-container, .ads-container").forEach((el) => el.remove());
  };

  /* ====================================================================
   *  TWITCH
   * ==================================================================== */
  const scrubTwitch = () => {
    const sels = [
      '[data-a-target="video-ad-label"]',
      ".video-ad",
      ".advertisement-banner",
      '[data-test-selector="ad-banner-default-id"]',
      ".stream-display-ad"
    ];
    for (const sel of sels) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }
  };

  /* ====================================================================
   *  TIKTOK
   * ==================================================================== */
  const scrubTikTok = () => {
    document.querySelectorAll('[class*="DivAdBanner"], [data-e2e="ad"]').forEach((el) => el.remove());
    document.querySelectorAll("div").forEach((el) => {
      if (/\bsponsored\b/i.test(el.getAttribute("class") || "")) el.remove();
    });
  };

  /* ====================================================================
   *  TEAMOS
   * Ad stack is mostly third-party (instrumenttactics / highperformanceformat
   * style networks), not domains from a typical hosts file.
   * ==================================================================== */
  const TEAMOS_AD_HOST_FRAGMENTS = [
    "instrumenttactics.com",
    "highperformanceformat.com",
    "highcpmgate.com",
    "onclickads.net",
    "onclicka.com",
    "pipaffiliates.com",
    "litebeach.com",
    "kettledroopingcontinuation.com",
    "realizationnewestfangs.com",
    "spendsdetachment.com",
    "zoologyfibre.com",
    "protrafficinspector.com",
    "portalfluently.com",
    "mamshirt.com",
    "cloudvideosa.com",
    "consumeririssalary.com",
    "fizzyacerbitymellow.com",
    "popads.net",
    "clksite.com",
    "adsterra.com",
    "hilltopads.net",
    "clickadu.com",
    "propellerads.com",
    "exoclick.com",
    "juicyads.com",
    "tsyndicate.com",
    "adtng.com"
  ];

  const teamOsUrlLooksLikeAd = (url) => {
    const u = String(url || "").toLowerCase();
    if (!u) return false;
    return TEAMOS_AD_HOST_FRAGMENTS.some((d) => u.includes(d));
  };

  const injectTeamOsCss = () => {
    if (document.getElementById("gsec-teamos-css")) return;
    const style = document.createElement("style");
    style.id = "gsec-teamos-css";
    style.textContent = `
      a[id^="atLink-"],
      iframe[src*="instrumenttactics"],
      iframe[src*="highperformanceformat"],
      iframe[id*="google_ads"],
      iframe[id*="aswift"],
      div[id^="container-"] > iframe,
      .adsbygoogle,
      ins.adsbygoogle,
      [data-ad-client],
      [data-ad-slot],
      a[href*="pipaffiliates.com"],
      a[href*="litebeach.com"],
      a[href*="sub3=invoke_layer"],
      a[href*="instrumenttactics"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const scrubTeamOS = () => {
    injectTeamOsCss();

    // 1. Remove top banner / affiliate ads
    const bannerSels = [
      'a[id^="atLink-"]',
      'a[href*="clicks.pipaffiliates.com"]',
      'a[href*="litebeach.com"]',
      'a[href*="instrumenttactics"]',
      'a[href*="highperformanceformat"]'
    ];
    for (const sel of bannerSels) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // 2. Remove invisible onclick/popunder overlays
    const popunderSels = [
      'a[href*="sub3=invoke_layer"]',
      'a[href*="key=a1e8916f3df739635783bc00fa07bfe6"]',
      'a[href*="key=ae333e82cfaead9ba22e64954c139352"]',
      'a[href*="/z3i66sdp?"]'
    ];
    for (const sel of popunderSels) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    // 3. Strip ad scripts / iframes injected by instrumenttactics etc.
    document.querySelectorAll("script[src], iframe[src], img[src], link[href]").forEach((el) => {
      const src = el.src || el.href || el.getAttribute("src") || el.getAttribute("href") || "";
      if (teamOsUrlLooksLikeAd(src)) {
        try { el.remove(); } catch (_) {}
      }
    });

    // 4. Collapse empty ad containers left after blocked network requests
    document.querySelectorAll("iframe, ins, div").forEach((el) => {
      try {
        const id = (el.id || "").toLowerCase();
        const cls = (el.className && String(el.className)) || "";
        if (
          id.startsWith("container-") ||
          id.includes("ad-container") ||
          id.includes("google_ads") ||
          /(?:^|\s)(?:ads?|adbox|ad-slot|banner-ad)(?:\s|$)/i.test(cls) ||
          el.getAttribute("data-ad-client") ||
          el.getAttribute("data-ad-slot")
        ) {
          // Only remove likely ad shells, not forum layout nodes
          if (el.tagName === "IFRAME" || el.tagName === "INS" || id.startsWith("container-")) {
            el.remove();
          }
        }
      } catch (_) {}
    });

    // 5. Neutralize atOptions / document.write ad bootstrap if present
    try {
      if (typeof window.atOptions === "object") {
        window.atOptions = { key: "", format: "iframe", height: 0, width: 0, params: {} };
      }
    } catch (_) {}
  };

  /* ====================================================================
   *  NEWS / CONTENT SITES (generic patterns)
   * ==================================================================== */
  const scrubNewsSites = () => {
    const sels = [
      "ins.adsbygoogle",
      'iframe[id*="google_ads"]',
      'iframe[id*="aswift"]',
      'div[id*="taboola"]',
      'div[id*="outbrain"]',
      'div[class*="taboola"]',
      'div[class*="outbrain"]',
      'div[class*="advert"]',
      'div[class*="ad-slot"]',
      'div[class*="ad-container"]',
      'div[class*="ad-wrapper"]',
      'div[class*="ad-banner"]',
      ".sponsored-content",
      ".promoted-content",
      ".native-ad",
      ".ad-unit",
      '[data-ad]',
      '[data-adunit]',
      '[data-ad-slot]',
      ".video-ad-overlay",
      ".preroll-ad",
      ".midroll-ad"
    ];
    for (const sel of sels) {
      document.querySelectorAll(sel).forEach((el) => {
        if (el && el.parentElement) el.remove();
      });
    }
  };

  /* ── Dispatcher ── */
  const removeAllAds = () => {
    if (host.includes("reddit.com")) {
      scrubReddit();
    } else if (host.includes("facebook.com")) {
      scrubFacebook();
    } else if (host.includes("twitter.com") || host.includes("x.com")) {
      scrubTwitter();
    } else if (host.includes("instagram.com")) {
      scrubInstagram();
    } else if (host.includes("linkedin.com")) {
      scrubLinkedIn();
    } else if (host.includes("twitch.tv")) {
      scrubTwitch();
    } else if (host.includes("tiktok.com")) {
      scrubTikTok();
    } else if (host.includes("teamos.xyz")) {
      scrubTeamOS();
    }
    // Always run generic news/content cleanup
    scrubNewsSites();
  };

  /* ── Bootstrap ── */
  injectMainWorld();

  if (host.includes("reddit.com")) {
    injectRedditCss();
  }
  if (host.includes("teamos.xyz")) {
    injectTeamOsCss();
  }

  removeAllAds();

  const intervalMs = host.includes("reddit.com") || host.includes("teamos.xyz") ? 500 : 1000;
  setInterval(removeAllAds, intervalMs);

  const startObserver = () => {
    const obs = new MutationObserver(removeAllAds);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.documentElement) startObserver();
  else document.addEventListener("DOMContentLoaded", startObserver);
})();
