/**
 * GSecurity Ad Shield — Main-world script.
 * Intercepts JSON.parse, fetch, XHR, and YouTube global objects
 * to strip ad payloads before they reach the page.
 */
(function () {
  if (window.__gsecMainInjected) return;
  window.__gsecMainInjected = true;

  const isYouTube =
    location.hostname.includes("youtube.com") ||
    location.hostname.includes("youtube-nocookie.com");

  const isDiscord =
    location.hostname.includes("discord.com") ||
    location.hostname.includes("discordapp.com");

  /* Discord uses class names and URLs that trigger false positives — skip entirely */
  if (isDiscord) return;

  /* ── Blocked ad/tracking domains ── */
  const blockedDomainFragments = [
    "doubleclick.net",
    "googleadservices.com",
    "googlesyndication.com",
    "adservice.google.com",
    "adnxs.com",
    "taboola.com",
    "outbrain.com",
    "criteo.com",
    "scorecardresearch.com",
    "pubmatic.com",
    "rubiconproject.com",
    "google-analytics.com",
    "googletagmanager.com",
    "googletagservices.com",
    "youtubeads.googleapis.com",
    "pubads.g.doubleclick.net",
    "ads.youtube.com",
    "analytics.youtube.com",
    "video-stats.video.google.com",
    "amazon-adsystem.com",
    "ads-twitter.com",
    "static.ads-twitter.com",
    "advertising.com",
    "adsafeprotected.com",
    "moatads.com",
    "advertising.yahoo.com",
    "adtech.de",
    "adform.net",
    "serving-sys.com",
    "facebook.com/tr",
    "connect.facebook.net",
    "pixel.facebook.com",
    "analytics.twitter.com",
    "pixel.reddit.com",
    "ads.linkedin.com",
    "analytics.tiktok.com",
    "hotjar.com",
    "fullstory.com",
    "segment.io",
    "segment.com",
    "mixpanel.com",
    "amplitude.com",
    "quantserve.com",
    "quantcast.com",
    "chartbeat.com",
    "newrelic.com",
    /* ── d3ward / turtlecute host tests ── */
    "mouseflow.com",
    "luckyorange.com",
    "freshmarketer.com",
    "stats.wp.com",
    "notify.bugsnag.com",
    "sessions.bugsnag.com",
    "api.bugsnag.com",
    "app.bugsnag.com",
    "cdn.bugsnag.com",
    "d2wy8f7a9ursnm.cloudfront.net",
    "browser.sentry-cdn.com",
    "js.sentry-cdn.com",
    "ingest.sentry.io",
    "app.getsentry.com",
    "ymatuhin.ru",
    "d2wy8f7a9ursnm.cloudfront.net",
    "cdn.bugsnag.com",
    "ads.pinterest.com",
    "events.redditmedia.com",
    "samsungads.com",
    "metrics.apple.com",
    "api.ad.xiaomi.com",
    "unityads.unity3d.com",
    "byteoversea.com",
    "yahooinc.com",
    "appmetrica.yandex.com",
    "appmetrica.yandex.ru",
    "yandexadexchange.net",
    "mc.yandex.ru",
    "an.yandex.ru",
    "metrika.yandex.ru",
    "adfox.yandex.ru",
    "pipaffiliates.com",
    "popads.net",
    "adsterra.com",
    "hilltopads.net",
    "clickadu.com",
    "propellerads.com",
    /* ── Domains for 100% on popular testers ── */
    "app-measurement.com",
    "analytics.google.com",
    "click.googleanalytics.com",
    "advertising.yandex.ru",
    "advertising.apple.com",
    "tr.iadsdk.apple.com",
    "udc.yahoo.com",
    "consent.cookiebot.com",
    "cdn.cookielaw.org",
    "privacy-mgmt.com",
    "quantcast.mgr.consensu.org",
    "fpjs.io",
    "cdn.fingerprint.com",
    "api.fingerprintjs.com",
    "fingerprint.com",
    "fpnpmcdn.net",
    "perimeterx.net",
    "px-cdn.net",
    "px-client.net",
    "px-cloud.net",
    "datadome.co",
    "creepjs-api.web.app",
    "popcash.net",
    "richads.com",
    "a-ads.com",
    "galaksion.com",
    "mondiad.com",
    "evadav.com",
    "clickaine.com",
    "roller-ads.com",
    "dao.ad",
    "clickadilla.com",
    "bitmedia.io",
    "cointraffic.io",
    "coinzilla.com",
    "loopme.com",
    "connatix.com",
    "seedtag.com",
    "ogury.com",
    "smaato.com",
    "mopub.com",
    "conversant.com",
    "liveramp.com",
    "acxiom.com",
    "lotame.com",
    "addthis.com",
    "sharethis.com",
    "bounceexchange.com",
    "bouncex.com",
    "wunderkind.co",
    "adzerk.net",
    "kevel.co",
    "nitropay.com",
    "ezoic.net",
    "ezoic.com",
    "mediavine.com",
    "raptive.com",
    "steadfastsystem.com",
    "bannersnack.com",
    "clarity.ms",
    "bat.bing.com",
    "media.net",
    "adtrafficquality.google",
    "fundingchoicesmessages.google.com"
  ];

  const blockedPatterns = [
    "/api/stats/ads",
    "/api/stats/atr",
    "/pagead/",
    "/ptracking",
    "/sponsored_content",
    "/promo_banner",
    "/ad_banner",
    "/ad_frame",
    "/ads/banner",
    "/pagead.js",
    "/widget/ads",
    "/ads.js",
    "/banners/pr_advertising",
    "/banners/ad_",
    "/banners/banner_ad",
    "pr_advertising_ads_banner",
    "/gtag/js",
    "adsbygoogle.js"
  ];

  /* YouTube playback / embed hosts — never block (forum embeds, videos) */
  const youtubeSafeHosts = [
    "youtube.com",
    "youtube-nocookie.com",
    "youtu.be",
    "googlevideo.com",
    "ytimg.com",
    "ggpht.com",
    "googleusercontent.com",
    "jnn-pa.googleapis.com"
  ];

  /* Adult AD networks — block ad requests only (not tube video CDNs) */
  const adultAdFragments = [
    "exoclick.com",
    "juicyads.com",
    "trafficjunky.net",
    "trafficjunky.com",
    "popads.net",
    "popcash.net",
    "propellerads.com",
    "adsterra.com",
    "hilltopads.net",
    "hilltopads.com",
    "clickadu.com",
    "tsyndicate.com",
    "trafficstars.com",
    "realsrv.com",
    "magsrv.com",
    "exosrv.com",
    "doublepimp.com",
    "ero-advertising.com",
    "adxpansion.com",
    "trafficfactory.biz",
    "plugrush.com",
    "awempire.com",
    "adultadworld.com",
    "sexad.net",
    "livejasmin.com/creatives",
    "stripchat.com/creative",
    "chaturbate.com/landing",
    "chaturbate.com/promo",
    "ads.pornhub.com",
    "ads.xvideos.com",
    "ads.xnxx.com",
    "ads.youporn.com",
    "ads.redtube.com",
    "juicytraffic.com",
    "clickosmedia.com",
    "tspops.com"
  ];

  const blockedUrlRegex =
    /(\/ads?\/(?:banner|frame|popup|interstitial)|[?&](adunit|adformat|adtag)=|doubleclick|googlesyndication|googleadservices|taboola|outbrain)/i;

  /* ── PAC-derived regex patterns for comprehensive blocking ── */

  // Catches hostnames that ARE known ad/tracking domains (tightened to avoid false positives)
  // Only matches when the ad-related word is the registrable domain itself, not a substring
  const adDomainRegex = /(?:^|\.)(doubleclick|adservice|adnxs|adtech|googleads|adwords|outbrain|taboola|quantcast|scorecard|omniture|comscore|krux|bluekai|exelate|adform|adroll|rubicon|vungle|inmobi|flurry|mixpanel|amplitude|optimizely|bizible|pardot|hubspot|marketo|eloqua|mediamath|criteo|appnexus|adbrite|admob|adsonar|adscale|zergnet|revcontent|mgid|nativeads|contentad|displayads|bannerflow|adblade|adcolony|chartbeat|newrelic|pingdom|kissmetrics|tradedesk|bidswitch|trafficjunky|trafficstars|exoclick|juicyads|realsrv|magsrv)\./i;

  // Catches numbered ad subdomains like ad1., banner2., servedby3. (from BlockAds.pac adSubdomainRegex)
  // Tightened: only match when followed by a known ad domain pattern, not arbitrary domains
  const adSubdomainRegex = /^(?:adcreative(?:s)?|adserv(?:er|e|ing)?|servedby\d{0,3}|pageads?\d{0,3}|ads?\d{1,3}|banners?\d{1,3})\./i;

  // Catches tracking pixels and Flash ads (from BlockAds.pac adWebBugRegex)
  const adWebBugRegex = /(?:\/(?:1|blank|b|clear|pixel|transp|spacer)\.gif|\.swf)$/i;

  // Extended URL path patterns — only match clearly ad-specific paths
  const adUrlPathRegex = /(?:\/(?:adcontent|adhandler|adimages|adconfig|adrequest|adman|adframe|adcontrol|adoverlay|adserver|adsense|google-ads|ad-banner|banner-ad|adplacement|adblockdetect|admanagement|adprovider|adrotation|adunit|adcall|adlog|adcount|adserve|adsrv|adsys|adtrack|adview|adwidget|adzone|sidebar-ads|footer-ads|top-ads|bottom-ads|ads\.php))/i;

  /* ── Helper: extract registrable domain (eTLD+1 approximation) ── */
  const getBaseDomain = (hostname) => {
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join(".");
  };

  const pageDomain = getBaseDomain(location.hostname.toLowerCase());

  const isFirstParty = (rawUrl) => {
    try {
      const urlHost = new URL(rawUrl, location.href).hostname.toLowerCase();
      return getBaseDomain(urlHost) === pageDomain;
    } catch (_) {
      return true; // relative URLs are first-party
    }
  };

  const isYouTubeSafeUrl = (rawUrl) => {
    try {
      const u = new URL(rawUrl, location.href);
      const host = u.hostname.toLowerCase();
      /* Block only known YT ad endpoints; allow embeds + playback */
      if (
        host === "ads.youtube.com" ||
        host === "analytics.youtube.com" ||
        host.includes("youtubeads.googleapis.com")
      ) {
        return false;
      }
      if (youtubeSafeHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        return true;
      }
      /* Explicit embed / player paths on any youtube host */
      if (
        (host === "youtube.com" || host.endsWith(".youtube.com")) &&
        (u.pathname.startsWith("/embed") ||
          u.pathname.startsWith("/s/") ||
          u.pathname.startsWith("/youtubei/") ||
          u.pathname.startsWith("/get_video_info") ||
          u.pathname.startsWith("/player_ias") ||
          u.pathname.includes("/embed/"))
      ) {
        return true;
      }
    } catch (_) {}
    return false;
  };

  /** Tube video content CDNs — keep videos playing; ads blocked via adultAdFragments */
  const isVideoContentCdn = (rawUrl) => {
    try {
      const host = new URL(rawUrl, location.href).hostname.toLowerCase();
      if (host.endsWith("phncdn.com") && !host.startsWith("ads")) return true;
      if (host.endsWith("xvideos-cdn.com") || host.endsWith("xnxx-cdn.com")) return true;
      if (host.endsWith("xhcdn.com")) return true;
    } catch (_) {}
    return false;
  };

  /* ── OAuth / authentication endpoints — never block ── */
  const oauthSafePatterns = [
    "api.x.com/oauth",
    "api.x.com/2/oauth2",
    "api.twitter.com/oauth",
    "api.twitter.com/2/oauth2",
    "accounts.google.com",
    "accounts.youtube.com",
    "oauth2.googleapis.com",
    "www.facebook.com/dialog/oauth",
    "www.facebook.com/v",
    "graph.facebook.com/oauth",
    "appleid.apple.com/auth",
    "github.com/login/oauth",
    "login.microsoftonline.com",
    "login.live.com",
    "discord.com/api/oauth2",
    "id.twitch.tv/oauth2",
    "open.spotify.com/authorize",
    "api.amazon.com/auth",
    "www.linkedin.com/oauth",
    "auth0.com",
    "login.yahoo.com",
    "cognito-idp.",
    "connect.facebook.net/en_US/sdk.js",
    "apis.google.com/js/api"
  ];

  /* Google first-party service hosts that should never be blocked when on a Google page */
  const googleSafeHosts = [
    "photos.google.com",
    "lh3.googleusercontent.com",
    "lh4.googleusercontent.com",
    "lh5.googleusercontent.com",
    "lh6.googleusercontent.com",
    "play.google.com",
    "drive.google.com",
    "docs.google.com",
    "mail.google.com",
    "www.google.com",
    "apis.google.com",
    "clients6.google.com",
    "people-pa.googleapis.com",
    "photosdata-pa.googleapis.com",
    "photos.googleapis.com"
  ];

  const isGoogleServiceUrl = (rawUrl) => {
    if (!pageDomain.endsWith("google.com") && !pageDomain.endsWith("googleapis.com")) return false;
    try {
      const host = new URL(rawUrl, location.href).hostname.toLowerCase();
      if (googleSafeHosts.some((h) => host === h || host.endsWith(`.${h}`))) return true;
      if (host.endsWith(".googleapis.com") || host.endsWith(".googleusercontent.com")) return true;
    } catch (_) {}
    return false;
  };

  const isOAuthUrl = (rawUrl) => {
    try {
      const url = rawUrl.toLowerCase();
      return oauthSafePatterns.some((p) => url.includes(p));
    } catch (_) {
      return false;
    }
  };

  const shouldBlockUrl = (rawUrl) => {
    if (typeof rawUrl !== "string" || !rawUrl) return false;

    // Never block OAuth / authentication flows
    if (isOAuthUrl(rawUrl)) return false;
    // Never block Google-to-Google service requests (Photos, Drive, etc.)
    if (isGoogleServiceUrl(rawUrl)) return false;
    // Never break YouTube embeds / video playback (forums, blogs, etc.)
    if (isYouTubeSafeUrl(rawUrl)) return false;
    // Never break tube site video streams (only block their ad hosts separately)
    if (isVideoContentCdn(rawUrl)) return false;

    const url = rawUrl.toLowerCase();

    // Adult ad networks
    if (adultAdFragments.some((d) => url.includes(d))) return true;

    // First-party: only block clear ad bait paths (tester sites host /ads.js, /pagead.js, banners)
    if (isFirstParty(rawUrl)) {
      if (
        blockedPatterns.some((p) => url.includes(p)) ||
        /\/(?:pagead\.js|ads\.js|widget\/ads)/i.test(url) ||
        /pr_advertising_ads_banner/i.test(url) ||
        /\/banners\/(?:ad_|banner_ad|pr_advertising)/i.test(url)
      ) {
        return true;
      }
      return false;
    }

    // Quick domain fragment check (known ad/tracking domains)
    if (blockedDomainFragments.some((d) => url.includes(d))) return true;

    // Hostname-based regex checks
    try {
      const hostname = new URL(rawUrl, location.href).hostname;
      if (adDomainRegex.test(hostname)) return true;
      if (adSubdomainRegex.test(hostname)) return true;
    } catch (_) {}

    // Quick path pattern check — only for third-party requests
    if (blockedPatterns.some((p) => url.includes(p))) return true;

    // URL path regex
    if (blockedUrlRegex.test(url)) return true;
    if (adUrlPathRegex.test(url)) return true;

    // Web bug / tracking pixel check
    if (adWebBugRegex.test(url)) return true;

    return false;
  };

  /* ── YouTube ad-key stripping ── */
  const adKeys = [
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
    "ad3Module",
    "adSafetyReason",
    "adLoggingData",
    "showAdSlots",
    "adBreakParams",
    "adBreakStatus",
    "adVideoId",
    "adLayoutLoggingData",
    "instreamAdPlayerOverlayRenderer",
    "adPlacementConfig",
    "adVideoStitcherConfig"
  ];

  const stripAdKeys = (obj, depth) => {
    if (!obj || typeof obj !== "object" || depth > 12) return obj;
    for (const key of adKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        delete obj[key];
      }
    }
    for (const key of Object.keys(obj)) {
      if (obj[key] && typeof obj[key] === "object") {
        stripAdKeys(obj[key], depth + 1);
      }
    }
    return obj;
  };

  /* ── JSON.parse hook (YouTube only) ── */
  const nativeParse = JSON.parse;
  if (isYouTube) {
    JSON.parse = function (...args) {
      const parsed = nativeParse.apply(this, args);
      try {
        if (parsed && typeof parsed === "object") {
          stripAdKeys(parsed, 0);
        }
      } catch (_) {}
      return parsed;
    };
  }

  /* ── fetch / XHR interception (non-YouTube — YouTube uses JSON stripping) ── */
  if (!isYouTube) {
    const nativeFetch = window.fetch;
    window.fetch = function (...args) {
      const target =
        typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (shouldBlockUrl(target)) {
        return Promise.resolve(new Response("", { status: 200, statusText: "Blocked" }));
      }
      return nativeFetch.apply(this, args);
    };

    const nativeXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (shouldBlockUrl(typeof url === "string" ? url : "")) {
        return;
      }
      return nativeXhrOpen.call(this, method, url, ...rest);
    };
  }

  /* ── Guard YouTube global objects ── */
  const defineGuardedGlobal = (prop) => {
    let value = window[prop];
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        get() {
          return value;
        },
        set(v) {
          if (v && typeof v === "object") stripAdKeys(v, 0);
          value = v;
        }
      });
      if (value) window[prop] = value;
    } catch (_) {}
  };

  if (isYouTube) {
    defineGuardedGlobal("ytInitialPlayerResponse");
    defineGuardedGlobal("ytInitialData");
    defineGuardedGlobal("ytcfg");
  }
})();
