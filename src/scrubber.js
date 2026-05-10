(function exposeScrubber(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.WebScrubbyScrubber = api;
})(typeof globalThis !== "undefined" ? globalThis : self, function createScrubber() {
  const HTTP_SCHEMES = new Set(["http:", "https:"]);
  const MAX_REDIRECT_DEPTH = 4;

  function normalizeRules(ruleDatabase) {
    if (!ruleDatabase) {
      return [];
    }

    if (Array.isArray(ruleDatabase)) {
      return ruleDatabase;
    }

    return Array.isArray(ruleDatabase.parameters) ? ruleDatabase.parameters : [];
  }

  function normalizeRedirectRules(ruleDatabase) {
    if (!ruleDatabase || Array.isArray(ruleDatabase)) {
      return [];
    }

    return Array.isArray(ruleDatabase.redirects) ? ruleDatabase.redirects : [];
  }

  function normalizeHost(hostname) {
    return String(hostname || "")
      .trim()
      .replace(/\.$/, "")
      .toLowerCase()
      .replace(/^www\./, "");
  }

  function hostnameFromUrl(value) {
    if (!value) {
      return "";
    }

    try {
      return normalizeHost(new URL(value).hostname);
    } catch (_error) {
      return "";
    }
  }

  function hostMatches(hostname, allowedHostnames) {
    const normalizedHost = normalizeHost(hostname);

    if (!normalizedHost || !Array.isArray(allowedHostnames)) {
      return false;
    }

    return allowedHostnames.some(function matchesAllowedHost(allowedHostname) {
      const normalizedAllowed = normalizeHost(allowedHostname);
      return (
        normalizedHost === normalizedAllowed ||
        normalizedHost.endsWith("." + normalizedAllowed)
      );
    });
  }

  function pathMatches(pathname, allowedPathnames) {
    if (!Array.isArray(allowedPathnames) || allowedPathnames.length === 0) {
      return true;
    }

    return allowedPathnames.some(function matchesAllowedPath(allowedPathname) {
      return pathname === allowedPathname;
    });
  }

  function normalizeTargetParams(rule) {
    if (Array.isArray(rule && rule.targetParams)) {
      return rule.targetParams
        .map(function normalizeTargetParam(targetParam) {
          return String(targetParam || "").trim();
        })
        .filter(Boolean);
    }

    if (rule && rule.targetParam) {
      return [String(rule.targetParam).trim()].filter(Boolean);
    }

    return [];
  }

  function parseHttpUrl(value) {
    const rawValue = String(value || "").trim();
    const candidates = [];

    if (!rawValue) {
      return null;
    }

    candidates.push(rawValue);

    try {
      const decodedValue = decodeURIComponent(rawValue);

      if (decodedValue !== rawValue) {
        candidates.push(decodedValue);
      }
    } catch (_error) {
      // Ignore malformed escape sequences and try the original value.
    }

    for (const candidate of candidates) {
      try {
        const parsedUrl = new URL(candidate);

        if (HTTP_SCHEMES.has(parsedUrl.protocol)) {
          return parsedUrl;
        }
      } catch (_error) {
        // Continue trying the remaining candidates.
      }
    }

    return null;
  }

  function redirectRuleMatchesUrl(parsedUrl, rule) {
    return (
      rule &&
      hostMatches(parsedUrl.hostname, rule.hostnames) &&
      pathMatches(parsedUrl.pathname, rule.pathnames)
    );
  }

  function findRedirectTarget(parsedUrl, redirectRules) {
    for (const rule of redirectRules) {
      if (!redirectRuleMatchesUrl(parsedUrl, rule)) {
        continue;
      }

      for (const targetParam of normalizeTargetParams(rule)) {
        const targetUrl = parseHttpUrl(parsedUrl.searchParams.get(targetParam));

        if (targetUrl && targetUrl.href !== parsedUrl.href) {
          return {
            param: targetParam,
            url: targetUrl
          };
        }
      }
    }

    return null;
  }

  function normalizedParamName(name, caseSensitive) {
    const value = String(name || "");
    return caseSensitive ? value : value.toLowerCase();
  }

  function ruleMatchesParam(paramName, rule) {
    if (!rule || !rule.name) {
      return false;
    }

    const caseSensitive = rule.caseSensitive === true;
    const candidate = normalizedParamName(paramName, caseSensitive);
    const target = normalizedParamName(rule.name, caseSensitive);
    const match = rule.match || "exact";

    if (match === "exact") {
      return candidate === target;
    }

    if (match === "prefix") {
      return candidate.startsWith(target);
    }

    if (match === "suffix") {
      return candidate.endsWith(target);
    }

    if (match === "regex") {
      try {
        return new RegExp(rule.pattern || rule.name, caseSensitive ? "" : "i").test(
          paramName
        );
      } catch (_error) {
        return false;
      }
    }

    return false;
  }

  function ruleAllowsContext(rule, context) {
    const removeWhen = rule.removeWhen || {};
    const referrerHostnames = Array.isArray(removeWhen.referrerHostnames)
      ? removeWhen.referrerHostnames
      : [];
    const hasRestrictions =
      referrerHostnames.length > 0 || removeWhen.noReferrer === true;

    if (!hasRestrictions) {
      return true;
    }

    if (hostMatches(context.referrerHostname, referrerHostnames)) {
      return true;
    }

    return (
      removeWhen.noReferrer === true &&
      context.allowNoReferrer === true &&
      !context.referrerHostname
    );
  }

  function shouldRemoveParam(paramName, ruleDatabase, options) {
    const rules = normalizeRules(ruleDatabase);
    const context = {
      allowNoReferrer: options && options.allowNoReferrer === true,
      referrerHostname: normalizeHost(options && options.referrerHostname)
    };

    return rules.some(function matchesRule(rule) {
      return ruleMatchesParam(paramName, rule) && ruleAllowsContext(rule, context);
    });
  }

  function scrubUrl(url, options) {
    const settings = options || {};
    let parsedUrl;

    try {
      parsedUrl = new URL(url, settings.baseUrl);
    } catch (_error) {
      return {
        changed: false,
        removed: [],
        url: url
      };
    }

    if (!HTTP_SCHEMES.has(parsedUrl.protocol)) {
      return {
        changed: false,
        removed: [],
        url: parsedUrl.href
      };
    }

    const originalUrl = parsedUrl.href;
    const redirectDepth = Number.isInteger(settings._redirectDepth)
      ? settings._redirectDepth
      : 0;
    const redirectTarget =
      parsedUrl.search && redirectDepth < MAX_REDIRECT_DEPTH
        ? findRedirectTarget(parsedUrl, normalizeRedirectRules(settings.rules))
        : null;

    if (redirectTarget) {
      const targetResult = scrubUrl(redirectTarget.url.href, {
        ...settings,
        _redirectDepth: redirectDepth + 1,
        baseUrl: undefined
      });

      return {
        changed: targetResult.url !== originalUrl,
        removed: targetResult.removed,
        unwrapped: redirectTarget.param,
        url: targetResult.url
      };
    }

    if (!parsedUrl.search) {
      return {
        changed: false,
        removed: [],
        url: originalUrl
      };
    }

    const rules = normalizeRules(settings.rules);
    const keptParams = new URLSearchParams();
    const removed = [];

    parsedUrl.searchParams.forEach(function inspectParam(value, name) {
      const shouldRemove = shouldRemoveParam(name, rules, settings);

      if (shouldRemove) {
        removed.push(name);
        return;
      }

      keptParams.append(name, value);
    });

    if (removed.length === 0) {
      return {
        changed: false,
        removed: [],
        url: originalUrl
      };
    }

    const nextSearch = keptParams.toString();
    parsedUrl.search = nextSearch ? "?" + nextSearch : "";

    return {
      changed: parsedUrl.href !== originalUrl,
      removed: removed,
      url: parsedUrl.href
    };
  }

  function getUnrestrictedExactParameters(ruleDatabase) {
    return normalizeRules(ruleDatabase)
      .filter(function isUnrestrictedExact(rule) {
        return (
          rule &&
          rule.match === "exact" &&
          rule.name &&
          !rule.removeWhen &&
          rule.caseSensitive !== true
        );
      })
      .map(function toName(rule) {
        return rule.name;
      });
  }

  return {
    getUnrestrictedExactParameters: getUnrestrictedExactParameters,
    hostnameFromUrl: hostnameFromUrl,
    hostMatches: hostMatches,
    normalizeHost: normalizeHost,
    scrubUrl: scrubUrl,
    shouldRemoveParam: shouldRemoveParam
  };
});
