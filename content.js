(function setupWebScrubbyContentScript() {
  const RULES_URL = chrome.runtime.getURL("rules/query-params.json");
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

  function closestAnchor(start) {
    let element = start;

    while (element && element !== document) {
      if (element instanceof HTMLAnchorElement && element.href) {
        return element;
      }

      element = element.parentNode || element.host;
    }

    return null;
  }

  function referrerHostnameForCurrentPage() {
    return WebScrubbyScrubber.normalizeHost(window.location.hostname);
  }

  async function scrubAnchor(anchor) {
    const rules = await loadRules();
    const result = WebScrubbyScrubber.scrubUrl(anchor.href, {
      rules: rules,
      referrerHostname: referrerHostnameForCurrentPage()
    });

    if (result.changed) {
      anchor.href = result.url;
    }
  }

  function scrubEventLink(event) {
    const anchor = closestAnchor(event.target);

    if (!anchor) {
      return;
    }

    scrubAnchor(anchor).catch(function ignoreScrubError() {});
  }

  async function scrubInitialLocation() {
    const rules = await loadRules();
    const referrerHostname = WebScrubbyScrubber.hostnameFromUrl(document.referrer);
    const result = WebScrubbyScrubber.scrubUrl(window.location.href, {
      allowNoReferrer: !referrerHostname,
      referrerHostname: referrerHostname,
      rules: rules
    });

    if (result.changed) {
      window.history.replaceState(window.history.state, document.title, result.url);
    }
  }

  document.addEventListener("pointerdown", scrubEventLink, true);
  document.addEventListener("mousedown", scrubEventLink, true);
  document.addEventListener("click", scrubEventLink, true);
  document.addEventListener("auxclick", scrubEventLink, true);
  document.addEventListener("contextmenu", scrubEventLink, true);

  scrubInitialLocation().catch(function ignoreInitialScrubError() {});
})();
