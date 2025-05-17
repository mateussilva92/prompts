"use strict";

const color = require("kleur");
const { cursor } = require("sisteransi");
const Prompt = require("./prompt");
const { clear, figures, style, wrap, entriesToDisplay } = require("../util");

const getValues = (options) => options.filter((option) => option.selected);

/**
 * MultiselectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class MultiselectPrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);

    const {
      message,
      cursor = 0,
      hint = "",
      warn = "- This option is disabled -",
      min,
      max,
      instructions,
      optionsPerPage = 10,
      choices = [],
      overrideRender,
    } = opts;

    this.message = message;
    this.cursor = cursor;
    this.scrollIndex = cursor;
    this.hint = hint;
    this.warn = warn;
    this.minSelected = min;
    this.maxSelected = max;
    this.instructions = instructions;
    this.optionsPerPage = optionsPerPage;

    this.initialOptions = this.mapChoices(choices);
    this.options = this.initialOptions;

    this.value = getValues(this.options);

    this.showMinError = false;
    this.clear = clear("", this.stdout.columns);

    if (!overrideRender) {
      this.render();
    }
  }

  reset() {
    this.options = this.initialOptions;
    this.value = getValues(this.options);
    this.cursor = 0;
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
    if (this.minSelected && this.value.length < this.minSelected) {
      this.showMinError = true;
      this.render();
    } else {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.stdout.write("\n");
      this.close();
    }
  }

  first() {
    this.cursor = 0;
    this.render();
  }

  last() {
    if (!this.options.length) return;

    this.cursor = this.options.length - 1;
    this.render();
  }

  next() {
    if (!this.options.length) return;

    this.cursor = (this.cursor + 1) % this.options.length;
    this.render();
  }

  up() {
    if (!this.options.length) return;

    this.cursor = (this.cursor - 1 + this.options.length) % this.options.length;
    this.render();
  }

  down() {
    this.next();
  }

  left() {
    if (!this.options.length) return;

    this.options[this.cursor].selected = false;
    this.render();
  }

  right() {
    if (!this.options.length) return;

    const option = this.options[this.cursor];
    const selectedAmount = this.value.length;

    if (selectedAmount >= this.maxChoice || option.disabled) {
      return this.bell();
    }

    option.selected = true;
    this.render();
  }

  handleSpaceToggle() {
    const option = this.options[this.cursor];

    option.selected ? this.left() : this.right();
  }

  toggleAll() {
    const option = this.options[this.cursor];

    // Determine if we're about to select this item
    let willSelect = !option.selected;

    if (option.disabled) {
      // If current option is disabled, see if there's any other option that is not selected
      willSelect = this.options.some(
        ({ disabled, selected }) => !disabled && !selected
      );
    }

    if (willSelect) {
      const selectable = this.options.filter(
        ({ disabled, selected }) => !disabled && !selected
      );

      if (selectable.length + this.value.length > this.maxSelected) {
        return this.bell();
      }
    }

    this.options
      .filter((v) => !v.disabled)
      .forEach((v) => (v.selected = willSelect));
    this.value = getValues(this.options);
    this.render();
  }

  onChar(c) {
    if (c === " ") {
      this.handleSpaceToggle();
    } else if (c === "a") {
      this.toggleAll();
    } else {
      return this.bell();
    }
  }

  mapChoices(choices) {
    return choices.map((choise, index) => {
      const isObject = typeof choise === "object" && choise !== null;

      return {
        title: isObject ? choise.title ?? choise.value ?? choise : choise,
        description: isObject ? choise.description : undefined,
        value: isObject ? choise.value ?? index : index,
        selected: isObject && choise.selected,
        disabled: isObject && choise.disabled,
      };
    });
  }

  renderInstructions() {
    if (this.instructions === undefined || this.instructions) {
      if (typeof this.instructions === "string") {
        return this.instructions;
      }
      return (
        "\nInstructions:\n" +
        `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n` +
        `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n` +
        (this.maxSelected === undefined ? `    a: Toggle all\n` : "") +
        `    enter/return: Complete answer`
      );
    }
    return "";
  }

  renderOption(cursor, v, i, arrowIndicator) {
    const prefix =
      (v.selected ? color.green(figures.radioOn) : figures.radioOff) +
      " " +
      arrowIndicator +
      " ";
    let title, desc;

    if (v.disabled) {
      title =
        cursor === i
          ? color.gray().underline(v.title)
          : color.strikethrough().gray(v.title);
    } else {
      title = cursor === i ? color.cyan().underline(v.title) : v.title;
      if (cursor === i && v.description) {
        desc = ` - ${v.description}`;
        if (
          prefix.length + title.length + desc.length >= this.stdout.columns ||
          v.description.split(/\r?\n/).length > 1
        ) {
          desc =
            "\n" +
            wrap(v.description, {
              margin: prefix.length,
              width: this.stdout.columns,
            });
        }
      }
    }

    return prefix + title + color.gray(desc || "");
  }

  // shared with autocompleteMultiselect
  paginateOptions(options) {
    if (options.length === 0) {
      return color.red("No matches for this query.");
    }

    let { startIndex, endIndex } = entriesToDisplay(
      this.cursor,
      options.length,
      this.optionsPerPage
    );
    let prefix,
      styledOptions = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        prefix = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        prefix = figures.arrowDown;
      } else {
        prefix = " ";
      }
      styledOptions.push(this.renderOption(this.cursor, options[i], i, prefix));
    }

    return "\n" + styledOptions.join("\n");
  }

  // shared with autocomleteMultiselect
  renderOptions(options) {
    if (!this.done) {
      return this.paginateOptions(options);
    }
    return "";
  }

  renderDoneOrInstructions() {
    if (this.done) {
      return this.value.map((v) => v.title).join(", ");
    }

    const output = [color.gray(this.hint), this.renderInstructions()];

    if (this.options[this.cursor].disabled) {
      output.push(color.yellow(this.warn));
    }
    return output.join(" ");
  }

  render() {
    if (this.closed) return;

    let output = "";
    if (!this.outputText) {
      // output += cursor.hide;
    }

    output += this.renderDoneOrInstructions();
    if (this.showMinError) {
      output += color.red(
        `You must select a minimum of ${this.minSelected} choices.`
      );
      this.showMinError = false;
    }

    output += this.renderOptions(this.options);

    super.render(output);
  }
}

module.exports = MultiselectPrompt;
