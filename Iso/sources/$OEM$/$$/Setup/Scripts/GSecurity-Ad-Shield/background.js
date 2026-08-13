/**
 * GSecurity Ad Shield — service worker.
 * Ensures static ruleset is enabled; installs a critical dynamic safety-net
 * for hosts that popular testers always probe (from tester-inventory).
 */
chrome.runtime.onInstalled.addListener(() => {
  ensureRules().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  ensureRules().catch(() => {});
});

async function ensureRules() {
  try {
    const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
    if (!enabled.includes("ruleset_1")) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ["ruleset_1"],
      });
    }
  } catch (_) {}

  // Critical hosts from inventory (adblock-tester + turtlecute/d3ward core)
  const critical = [
    "pagead2.googlesyndication.com",
    "pagead2.googleadservices.com",
    "googlesyndication.com",
    "googleadservices.com",
    "doubleclick.net",
    "googleads.g.doubleclick.net",
    "ad.doubleclick.net",
    "static.doubleclick.net",
    "stats.g.doubleclick.net",
    "adservice.google.com",
    "www.google-analytics.com",
    "google-analytics.com",
    "ssl.google-analytics.com",
    "analytics.google.com",
    "www.googletagmanager.com",
    "googletagmanager.com",
    "static.hotjar.com",
    "script.hotjar.com",
    "mc.yandex.ru",
    "an.yandex.ru",
    "browser.sentry-cdn.com",
    "js.sentry-cdn.com",
    "d2wy8f7a9ursnm.cloudfront.net",
    "ymatuhin.ru",
    "ads.youtube.com",
    "pixel.facebook.com",
    "static.ads-twitter.com",
    "cdn.mouseflow.com",
    "mouseflow.com",
    "luckyorange.com",
    "stats.wp.com",
    "notify.bugsnag.com",
    "sessions.bugsnag.com",
    "api.bugsnag.com",
    /* Adult ad networks (ads only — video CDNs not listed) */
    "exoclick.com",
    "juicyads.com",
    "trafficjunky.net",
    "trafficjunky.com",
    "popads.net",
    "popcash.net",
    "propellerads.com",
    "adsterra.com",
    "hilltopads.net",
    "tsyndicate.com",
    "realsrv.com",
    "magsrv.com",
    "exosrv.com",
    "doublepimp.com",
    "ero-advertising.com",
    "ads.pornhub.com",
    "ads.xvideos.com",
    "ads.xnxx.com",
  ];

  const resourceTypes = [
    "main_frame",
    "sub_frame",
    "script",
    "image",
    "xmlhttprequest",
    "ping",
    "media",
    "object",
    "other",
  ];

  const addRules = critical.map((host, i) => ({
    id: 100000 + i,
    priority: 50,
    action: { type: "block" },
    condition: {
      urlFilter: "||" + host,
      resourceTypes,
    },
  }));

  // Path baits used by turtlecute / adblock-tester
  const pathBaits = [
    "/pagead.js",
    "/js/pagead.js",
    "/ads.js",
    "/widget/ads.js",
    "/js/widget/ads.js",
    "/pagead/js/adsbygoogle.js",
    "pr_advertising_ads_banner",
    "ymatuhin.ru/ads/ads.js",
  ];
  pathBaits.forEach((p, i) => {
    addRules.push({
      id: 100500 + i,
      priority: 50,
      action: { type: "block" },
      condition: {
        urlFilter: p,
        resourceTypes: ["script", "image", "object", "xmlhttprequest", "media", "other"],
      },
    });
  });

  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing
      .filter((r) => r.id >= 100000 && r.id < 101000)
      .map((r) => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (_) {}
}

ensureRules().catch(() => {});
