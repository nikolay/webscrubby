async function copyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy command was rejected.");
    }
  } finally {
    textarea.remove();
  }
}

chrome.runtime.onMessage.addListener(function handleMessage(
  message,
  _sender,
  sendResponse
) {
  if (!message || message.target !== "offscreen" || message.type !== "copy-to-clipboard") {
    return false;
  }

  copyText(message.text)
    .then(function reportSuccess() {
      sendResponse({ ok: true });
    })
    .catch(function reportFailure(error) {
      sendResponse({
        error: error && error.message ? error.message : String(error),
        ok: false
      });
    });

  return true;
});
