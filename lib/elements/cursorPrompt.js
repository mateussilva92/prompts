const Prompt = require("./prompt");
const { cursor } = require("sisteransi");

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.initial] Default value
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
class CursorPrompt extends Prompt {
  cursor = 0;

  constructor(opts = {}) {
    super(opts);
  }

  /**
   * Actions
   */
  first() {
    this.cursor = 0;
  }

  home() {
    this.first();
  }

  last() {
    this.cursor = this.value.length;
  }

  end() {
    this.last();
  }

  right() {
    this.value.length > this.cursor && this.cursor++;
  }

  left() {
    this.cursor > 0 && this.cursor--;
  }

  delete() {
    if (this.value.length) {
      this.value =
        this.value.slice(0, this.cursor - 1) + this.value.slice(this.cursor);
      this.cursor--;
    }
  }

  deleteForward() {
    if (this.value.length) {
      this.value =
        this.value.slice(0, this.cursor) + this.value.slice(this.cursor + 1);
    }
  }

  onChar(char) {
    const beforeCursor = this.value.slice(0, this.cursor);
    const afterCursor = this.value.slice(this.cursor);

    this.value = `${beforeCursor}${char}${afterCursor}`;
    this.cursor = beforeCursor.length + 1;
  }

  render(output) {
    const input = this.input !== undefined ? this.input : this.value;

    // output += cursor.move(this.cursor - input.length);
    output = cursor.save + output + cursor.restore + cursor.move(this.cursor);

    super.render(output);
  }
}

module.exports = CursorPrompt;
