# WebScrubby Chrome Web Store Listing Draft

## Store Presence

- Name: WebScrubby
- Website: https://webscrubby.com/
- Support email: support@webscrubby.com
- Privacy policy: https://webscrubby.com/privacy.html
- Category: Productivity
- Language: English

## Short Description

Remove tracking parameters from links as you browse and copy cleaner URLs from the context menu.

## Detailed Description

WebScrubby is a small Chrome extension for cleaner links.

It removes common campaign, ad, email, and social tracking query parameters from URLs before you open or copy them. It also understands common redirect wrappers, so links such as Facebook, Google, YouTube, LinkedIn, and Slack outbound redirects can be unwrapped and scrubbed at the embedded destination URL.

Features:

- Scrubs common tracking parameters such as UTM tags, click IDs, and newsletter identifiers.
- Adds a right-click menu item: Copy scrubbed link.
- Handles direct/no-referrer navigations, including typed or pasted URLs.
- Unwraps supported redirect services before removing tracking parameters.
- Runs locally in the browser with bundled rules.

WebScrubby does not include analytics, ads, or a remote WebScrubby server.

## Single Purpose

WebScrubby removes tracking information from navigated and copied URLs.

## Permission Justifications

- `host_permissions` for `http://*/*` and `https://*/*`: inspect and clean link URLs on pages and main-frame navigations.
- `declarativeNetRequest`: remove known unrestricted tracking parameters during browser navigation.
- `webNavigation`: detect direct navigations so typed or pasted URLs can be scrubbed.
- `webRequest`: detect main-frame requests without a `Referer` header so no-referrer URL cleanup can run.
- `tabs`: update the current tab URL when a direct/no-referrer navigation needs to be replaced with a scrubbed URL.
- `contextMenus`: add the `Copy scrubbed link` command to link context menus.
- `clipboardWrite`: copy the scrubbed URL after the user chooses the context-menu command.
- `offscreen`: provide the Manifest V3 clipboard helper used by the background service worker.

## Privacy Disclosure

WebScrubby processes URLs, link destinations, and referrer hostnames locally in Chrome. It does not collect, sell, transmit, or share personal data with a WebScrubby server. Clipboard writing happens only after the user chooses `Copy scrubbed link`.

## Assets

- Extension icon: `assets/icons/icon-128.png`
- Store package ZIP: generated with `bash scripts/package-extension.sh`
- Privacy policy: `site/privacy.html`
- Terms: `site/terms.html`

