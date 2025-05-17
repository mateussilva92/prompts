"use strict";

const color = require("kleur");
const MultiselectPrompt = require("./multiselect");
const { clear, figures } = require("../util");
/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {Function} [opts.search] Search/Filter function. Defaults to sort options by title
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  constructor(opts = {}) {
    opts.overrideRender = true;
    super(opts);
    this.search = opts.search;

    this.inputValue = "";
    this.clear = clear("", this.stdout.columns);
    this.updateOptions();

    this.render();
  }

  delete() {
    if (!this.inputValue.length) return;

    this.inputValue = this.inputValue.slice(0, -1);
    this.updateOptions();
  }

  updateOptions() {
    const option = this.options[this.cursor];
    const search = this.inputValue.toLowerCase().trim();

    this.options = this.initialOptions.filter((item) => {
      if (!search) return true;

      const title =
        typeof item.title === "string" ? item.title.toLowerCase() : "";
      const value =
        typeof item.value === "string" ? item.value.toLowerCase() : "";

      return title.includes(search) || value.includes(search);
    });

    const newHighlightIndex = this.options.indexOf(option);
    this.cursor = Math.max(newHighlightIndex, 0);
  }

  onChar(c) {
    this.inputValue = this.inputValue + c;
    this.updateOptions();
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === "string") {
        return this.instructions;
      }
      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}: Toggle selection
    [a..z]/delete: Filter choices
    enter/return: Complete answer
`;
    }
    return "";
  }

  renderCurrentInput() {
    return `
Filtered results for: ${
      this.inputValue
        ? this.inputValue
        : color.gray("Enter something to filter")
    }\n`;
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.map((v) => v.title).join(", ");
    }

    const output = [
      color.gray(this.hint),
      this.renderInstructions(),
      this.renderCurrentInput(),
    ];

    if (this.options.length && this.options[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(" ");
  }

  render() {
    super.render();
  }
}

module.exports = AutocompleteMultiselectPrompt;
