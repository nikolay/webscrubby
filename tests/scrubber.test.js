const assert = require("node:assert/strict");
const rules = require("../rules/query-params.json");
const scrubber = require("../src/scrubber.js");

function scrub(url, options = {}) {
  return scrubber.scrubUrl(url, {
    rules,
    ...options
  }).url;
}

assert.equal(
  scrub("https://example.com/article?utm_source=newsletter&utm_medium=email&id=42"),
  "https://example.com/article?id=42"
);

assert.equal(
  scrub("https://example.com/?HSA_ACC=123&keep=yes"),
  "https://example.com/?keep=yes"
);

assert.equal(
  scrub("https://example.com/?ref=producthunt&id=42", {
    referrerHostname: "www.producthunt.com"
  }),
  "https://example.com/?id=42"
);

assert.equal(
  scrub("https://example.com/?ref=producthunt&id=42", {
    referrerHostname: "example.org"
  }),
  "https://example.com/?ref=producthunt&id=42"
);

assert.equal(
  scrub("https://example.com/?ref=producthunt&id=42", {
    allowNoReferrer: true
  }),
  "https://example.com/?id=42"
);

assert.equal(
  scrub("https://example.com/?fbclid=abc&fbclid=def&id=42#comments"),
  "https://example.com/?id=42#comments"
);

const facebookRedirect = scrubber.scrubUrl(
  "https://l.facebook.com/l.php?u=https%3A%2F%2Fnikolay.com%2F%3Ffbclid%3Dabc&h=token",
  {
    rules
  }
);

assert.equal(facebookRedirect.changed, true);
assert.equal(facebookRedirect.unwrapped, "u");
assert.deepEqual(facebookRedirect.removed, ["fbclid"]);
assert.equal(facebookRedirect.url, "https://nikolay.com/");

assert.equal(
  scrub(
    "https://l.facebook.com/l.php?u=https%3A%2F%2Fnikolay.com%2Farticle%3Fid%3D42&h=token"
  ),
  "https://nikolay.com/article?id=42"
);

assert.equal(
  scrub(
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dsearch%26id%3D42&sa=D"
  ),
  "https://example.com/?id=42"
);

assert.equal(
  scrub(
    "https://example.com/redirect?u=https%3A%2F%2Fnikolay.com%2F%3Ffbclid%3Dabc&id=42"
  ),
  "https://example.com/redirect?u=https%3A%2F%2Fnikolay.com%2F%3Ffbclid%3Dabc&id=42"
);

assert.equal(
  scrub("mailto:test@example.com?utm_source=x"),
  "mailto:test@example.com?utm_source=x"
);

assert.deepEqual(
  scrubber.getUnrestrictedExactParameters(rules).slice(0, 3),
  ["gclid", "gclsrc", "dclid"]
);

console.log("WebScrubby scrubber tests passed.");
