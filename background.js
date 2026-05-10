importScripts("src/scrubber.js");

const RULES_URL = chrome.runtime.getURL("rules/query-params.json");
const CONTEXT_MENU_ID = "copy-scrubbed-link";
const DNR_RULE_ID = 1;
let rulesPromise;

function loadRules() {
  if (!rulesPromise) {
    rulesPromise = fetch(RULES_URL).then(function parseRules(response) {
      if (!response.ok) {
        throw new Error("Could not load WebScrubby rules.");
      }

      return response.json();
    });
  }

  return rulesPromise;
}

function createContextMenu() {
  chrome.contextMenus.removeAll(function recreateContextMenu() {
    chrome.contextMenus.create({
      contexts: ["link"],
      id: CONTEXT_MENU_ID,
      title: "Copy scrubbed link"
    });
  });
}

async function installDeclarativeRules() {
  const rules = await loadRules();
  const removeParams = WebScrubbyScrubber.getUnrestrictedExactParameters(rules);
  const nextRules = removeParams.length
    ? [
        {
          id: DNR_RULE_ID,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              transform: {
                queryTransform: {
                  removeParams: removeParams
                }
              }
            }
          },
          condition: {
            regexFilter: "^https?://.*[?&]",
            resourceTypes: ["main_frame"]
          }
        }
      ]
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: nextRules,
    removeRuleIds: [DNR_RULE_ID]
  });
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");

  if (chrome.offscreen.hasDocument && (await chrome.offscreen.hasDocument())) {
    return;
  }

  if (!chrome.offscreen.hasDocument) {
    const clients = await self.clients.matchAll();
    const hasOffscreenDocument = clients.some(function isOffscreenClient(client) {
      return client.url === offscreenUrl;
    });

    if (hasOffscreenDocument) {
      return;
    }
  }

  await chrome.offscreen.createDocument({
    justification: "Copy scrubbed links from the WebScrubby context menu.",
    reasons: ["CLIPBOARD"],
    url: "offscreen.html"
  });
}

async function copyToClipboard(text) {
  await ensureOffscreenDocument();

  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    text: text,
    type: "copy-to-clipboard"
  });

  if (!response || response.ok !== true) {
    throw new Error((response && response.error) || "Clipboard copy failed.");
  }
}

function isDirectNavigation(details) {
  const directTransitionTypes = new Set([
    "auto_bookmark",
    "generated",
    "keyword",
    "keyword_generated",
    "start_page",
    "typed"
  ]);
  const qualifiers = Array.isArray(details.transitionQualifiers)
    ? details.transitionQualifiers
    : [];

  return (
    directTransitionTypes.has(details.transitionType) ||
    qualifiers.includes("from_address_bar")
  );
}

function hasRefererHeader(requestHeaders) {
  if (!Array.isArray(requestHeaders)) {
    return false;
  }

  return requestHeaders.some(function isRefererHeader(header) {
    return header.name && header.name.toLowerCase() === "referer" && header.value;
  });
}

function scrubTabUrlAsNoReferrer(tabId, url) {
  if (tabId < 0) {
    return;
  }

  loadRules()
    .then(function scrubNoReferrerUrl(rules) {
      const result = WebScrubbyScrubber.scrubUrl(url, {
        allowNoReferrer: true,
        rules: rules
      });

      if (result.changed) {
        return chrome.tabs.update(tabId, {
          url: result.url
        });
      }

      return undefined;
    })
    .catch(function logNoReferrerError(error) {
      console.error("WebScrubby could not scrub a no-referrer navigation:", error);
    });
}

chrome.runtime.onInstalled.addListener(function handleInstalled() {
  createContextMenu();
  installDeclarativeRules().catch(function logInstallError(error) {
    console.error("WebScrubby could not install declarative rules:", error);
  });
});

chrome.runtime.onStartup.addListener(function handleStartup() {
  createContextMenu();
  installDeclarativeRules().catch(function logStartupError(error) {
    console.error("WebScrubby could not install declarative rules:", error);
  });
});

chrome.contextMenus.onClicked.addListener(function handleContextMenu(info) {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.linkUrl) {
    return;
  }

  loadRules()
    .then(function scrubClickedLink(rules) {
      const pageHostname = WebScrubbyScrubber.hostnameFromUrl(info.pageUrl);
      const result = WebScrubbyScrubber.scrubUrl(info.linkUrl, {
        allowNoReferrer: !pageHostname,
        referrerHostname: pageHostname,
        rules: rules
      });

      return copyToClipboard(result.url);
    })
    .catch(function logCopyError(error) {
      console.error("WebScrubby could not copy a scrubbed link:", error);
    });
});

chrome.webNavigation.onCommitted.addListener(
  function handleCommittedNavigation(details) {
    if (details.frameId !== 0 || !isDirectNavigation(details)) {
      return;
    }

    scrubTabUrlAsNoReferrer(details.tabId, details.url);
  },
  {
    url: [
      {
        schemes: ["http", "https"]
      }
    ]
  }
);

chrome.webRequest.onBeforeSendHeaders.addListener(
  function handleBeforeSendHeaders(details) {
    if (hasRefererHeader(details.requestHeaders)) {
      return;
    }

    scrubTabUrlAsNoReferrer(details.tabId, details.url);
  },
  {
    types: ["main_frame"],
    urls: ["http://*/*", "https://*/*"]
  },
  ["requestHeaders", "extraHeaders"]
);
