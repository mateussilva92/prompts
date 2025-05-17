"use strict";

const color = require("kleur");
const Prompt = require("./prompt");
const { clear, figures, wrap, entriesToDisplay } = require("../util");
const { cursor } = require("sisteransi");

/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */
class SelectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.message = opts.message;
    this.hint = opts.hint || "- Use arrow-keys. Return to submit.";
    this.warn = opts.warn || "- This option is disabled";
    this.cursor = opts.initial || 0;
    this.choices = opts.choices.map((ch, idx) => {
      if (typeof ch === "string") ch = { title: ch, value: idx };
      return {
        title: ch && (ch.title || ch.value || ch),
        value: ch && (ch.value === undefined ? idx : ch.value),
        description: ch && ch.description,
        selected: ch && ch.selected,
        disabled: ch && ch.disabled,
      };
    });
    this.optionsPerPage = opts.optionsPerPage || 10;
    this.value = (this.choices[this.cursor] || {}).value;
    this.clear = clear("", this.stdout.columns);
    this.render();
  }

  moveCursor(n) {
    this.cursor = n;
    this.value = this.choices[n].value;
    this.fire();
  }

  reset() {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  exit() {
    this.abort();
  }

  abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  submit() {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.stdout.write("\n");
      this.close();
    } else this.bell();
  }

  first() {
    this.moveCursor(0);
    this.render();
  }

  last() {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  up() {
    if (this.cursor === 0) {
      this.moveCursor(this.choices.length - 1);
    } else {
      this.moveCursor(this.cursor - 1);
    }
    this.render();
  }

  down() {
    if (this.cursor === this.choices.length - 1) {
      this.moveCursor(0);
    } else {
      this.moveCursor(this.cursor + 1);
    }
    this.render();
  }

  next() {
    this.moveCursor((this.cursor + 1) % this.choices.length);
    this.render();
  }

  onChar(c) {
    if (c === " ") return this.submit();
  }

  get selection() {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;

    let output = "";
    if (!this.outputText) {
      output += cursor.hide;
    }

    let { startIndex, endIndex } = entriesToDisplay(
      this.cursor,
      this.choices.length,
      this.optionsPerPage
    );

    // Print prompt
    output += this.done
      ? this.selection.title
      : this.selection.disabled
      ? color.yellow(this.warn)
      : color.gray(this.hint);

    // Print choices
    if (!this.done) {
      output += "\n";
      for (let i = startIndex; i < endIndex; i++) {
        let title,
          prefix,
          desc = "",
          v = this.choices[i];

        // Determine whether to display "more choices" indicators
        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        } else {
          prefix = " ";
        }

        if (v.disabled) {
          title =
            this.cursor === i
              ? color.gray().underline(v.title)
              : color.strikethrough().gray(v.title);
          prefix =
            (this.cursor === i
              ? color.bold().gray(figures.pointer) + " "
              : "  ") + prefix;
        } else {
          title = this.cursor === i ? color.cyan().underline(v.title) : v.title;
          prefix =
            (this.cursor === i ? color.cyan(figures.pointer) + " " : "  ") +
            prefix;
          if (v.description && this.cursor === i) {
            desc = ` - ${v.description}`;
            if (
              prefix.length + title.length + desc.length >=
                this.stdout.columns ||
              v.description.split(/\r?\n/).length > 1
            ) {
              desc =
                "\n" +
                wrap(v.description, { margin: 3, width: this.stdout.columns });
            }
          }
        }

        output += `${prefix} ${title}${color.gray(desc)}\n`;
      }
    }

    super.render(output);
  }
}

module.exports = SelectPrompt;
