"use strict";

const readline = require("readline");
const { action } = require("../util");
const EventEmitter = require("events");
const { beep, cursor } = require("sisteransi");
const color = require("kleur");
const { clear, style, lines } = require("../util");
const fs = require("fs");

/**
 * Base cursor prompt skeleton
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class Prompt extends EventEmitter {
  constructor(opts = {}) {
    super();

    this.stdin = opts.stdin || process.stdin;
    this.stdout = opts.stdout || process.stdout;
    this.onRender = opts.onRender?.bind(this);

    const rl = readline.createInterface({
      input: this.stdin,
      escapeCodeTimeout: 50,
    });
    readline.emitKeypressEvents(this.stdin, rl);

    if (this.stdin.isTTY) {
      this.stdin.setRawMode(true);
    }

    const isSelect = ["SelectPrompt", "MultiselectPrompt"].includes(
      this.constructor.name
    );

    const keypress = (char, key) => {
      const actionName = action(key, isSelect);
      if (!actionName) {
        // no action, single character
        this.onChar && this.onChar(char, key);
      } else if (typeof this[actionName] === "function") {
        this[actionName](key);
      } else {
        this.bell();
        return;
      }

      this.render();
    };

    this.stdin.on("keypress", keypress);

    this.close = () => {
      this.stdin.removeListener("keypress", keypress);

      this.stdout.write(cursor.show);
      if (this.stdin.isTTY) this.stdin.setRawMode(false);
      rl.close();
      this.emit(
        this.aborted ? "abort" : this.exited ? "exit" : "submit",
        this.value
      );
      this.closed = true;
    };
  }

  fire() {
    this.emit("state", {
      value: this.value,
      aborted: !!this.aborted,
      exited: !!this.exited,
    });
  }

  bell() {
    this.stdout.write(beep);
  }

  render(output) {
    let clearScreen = "";

    if (this.outputText) {
      clearScreen += clear(this.outputText, this.stdout.columns);

      if (this.outputError) {
        clearScreen +=
          cursor.down(lines(this.outputError, this.stdout.columns)) +
          clear(this.outputError, this.stdout.columns);
      }
    }

    this.outputText = [
      style.symbol(this.done, this.aborted),
      color.bold(this.message),
      style.delimiter(this.done),
      output,
    ].join(" ");

    // fs.appendFileSync("result.txt", clearScreen + this.outputText);

    this.stdout.write(clearScreen + this.outputText);

    this.onRender && this.onRender(color);
  }
}

module.exports = Prompt;
