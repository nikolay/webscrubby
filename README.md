# WebScrubby

WebScrubby is a Manifest V3 Chrome extension that removes common tracking query
parameters from navigated links and adds a right-click menu item for copying a
scrubbed version of any link.

The project website is served from `site/` at <https://webscrubby.com/>.

## What It Scrubs

Rules live in `rules/query-params.json`. Each rule can match an exact parameter,
prefix, suffix, or regular expression. Most rules are unconditional, while a rule
can also define `removeWhen.referrerHostnames` and `removeWhen.noReferrer`.

For example, `ref` is removed when the referrer hostname is `producthunt.com` or
when the navigation has no referrer, such as a pasted URL or a URL opened from
another app.

The same rules file can also define redirect wrappers. For example,
`https://l.facebook.com/l.php?u=<encoded target>` is unwrapped by reading the
`u` parameter as its own URL, then scrubbing that decoded target URL.

## How It Works

- `src/scrubber.js` is the shared URL scrubbing engine.
- `content.js` scrubs links before click, middle-click, or context-menu actions.
- `background.js` installs a dynamic Declarative Net Request rule for
  unrestricted exact-match parameters, handles direct/no-referrer navigations,
  observes main-frame requests without `Referer` headers, and owns the
  `Copy scrubbed link` context menu.
- `offscreen.html` and `offscreen.js` provide the clipboard helper needed by the
  Manifest V3 background service worker.

## Load Locally

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Choose `Load unpacked`.
4. Select this directory.

## Test

```sh
npm test
```

## Package

Create the Chrome extension upload ZIP with:

```sh
bash scripts/package-extension.sh
```

The ZIP contains only the extension files needed by Chrome.

## Website Deployment

The static GitHub Pages site is in `site/` with:

- `site/index.html`
- `site/privacy.html`
- `site/terms.html`
- `site/styles.css`
- `site/CNAME` (`webscrubby.com`)

GitHub Pages is deployed by `.github/workflows/pages.yml`.

## Release Automation

`Tag Extension Release` creates an annotated tag named `extension-v<manifest version>`.
That tag triggers:

- `Release Extension Package`, which validates the extension, builds a ZIP, and
  attaches it to a GitHub release.
- `Publish Chrome Web Store`, which uploads and submits the package after the
  first Chrome Web Store item exists and the required repository secrets are set.

Required Chrome Web Store repository secrets:

- `CWS_EXTENSION_ID`
- `CWS_PUBLISHER_ID`
- `CWS_SERVICE_ACCOUNT_JSON`
- `CWS_CRX_PRIVATE_KEY` only if Verified CRX uploads are enabled

The first Chrome Web Store item still needs to be created manually in the
Developer Dashboard. Use `store-assets/listing.md` and
`store-assets/submission-checklist.md` for that first submission.
