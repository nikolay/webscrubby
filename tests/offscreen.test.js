const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function createContext(options = {}) {
  let appendedNode;
  let copiedCommand;
  let registeredListener;

  const textarea = {
    focusCalled: false,
    removeCalled: false,
    selectCalled: false,
    focus: function focus() {
      this.focusCalled = true;
    },
    setAttribute: function setAttribute(name, value) {
      this[name] = value;
    },
    select: function select() {
      this.selectCalled = true;
    },
    remove: function remove() {
      this.removeCalled = true;
    },
    style: {},
    value: ""
  };

  const context = {
    chrome: {
      runtime: {
        onMessage: {
          addListener: function addListener(listener) {
            registeredListener = listener;
          }
        }
      }
    },
    document: {
      body: {
        appendChild: function appendChild(node) {
          appendedNode = node;
        }
      },
      createElement: function createElement(tagName) {
        assert.strictEqual(tagName, "textarea");
        return textarea;
      },
      execCommand: function execCommand(command) {
        copiedCommand = command;
        return options.execCommandResult !== false;
      }
    },
    navigator: options.navigator || {}
  };

  vm.runInNewContext(fs.readFileSync("offscreen.js", "utf8"), context, {
    filename: "offscreen.js"
  });

  return {
    context,
    get appendedNode() {
      return appendedNode;
    },
    get copiedCommand() {
      return copiedCommand;
    },
    get registeredListener() {
      return registeredListener;
    },
    textarea
  };
}

(async function run() {
  let writeTextCalled = false;
  const copy = createContext({
    navigator: {
      clipboard: {
        writeText: async function writeText() {
          writeTextCalled = true;
          throw new Error("Clipboard API rejected the write.");
        }
      }
    }
  });

  await copy.context.copyText("https://example.com/?id=42");

  assert.strictEqual(writeTextCalled, false);
  assert.strictEqual(copy.appendedNode.value, "https://example.com/?id=42");
  assert.strictEqual(copy.textarea.focusCalled, true);
  assert.strictEqual(copy.textarea.selectCalled, true);
  assert.strictEqual(copy.textarea.removeCalled, true);
  assert.strictEqual(copy.copiedCommand, "copy");

  const rejectedCommand = createContext({
    execCommandResult: false
  });

  await assert.rejects(
    rejectedCommand.context.copyText("https://example.com/"),
    /Clipboard copy command was rejected/
  );

  assert.strictEqual(typeof copy.registeredListener, "function");

  console.log("WebScrubby offscreen clipboard tests passed.");
})();
