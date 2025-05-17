const color = require("kleur");
const Prompt = require("./prompt");
const { cursor } = require("sisteransi");

/**
 * TogglePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial=false] Default value
 * @param {String} [opts.active='no'] Active label
 * @param {String} [opts.inactive='off'] Inactive label
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
class TogglePrompt extends Prompt {
  constructor(opts = {}) {
    super(opts);
    this.message = opts.message;
    this.value = !!opts.initial;
    this.active = opts.active || "on";
    this.inactive = opts.inactive || "off";
    this.initialValue = this.value;
    this.render();
  }

  reset() {
    this.value = this.initialValue;
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
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  delete() {
    this.deactivate();
  }
  left() {
    this.deactivate();
  }
  right() {
    this.activate();
  }
  down() {
    this.deactivate();
  }
  up() {
    this.activate();
  }

  next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  onChar(c) {
    if (c === " ") {
      this.value = !this.value;
    } else if (c === "1") {
      this.value = true;
    } else if (c === "0") {
      this.value = false;
    } else return this.bell();
  }

  render() {
    if (this.closed) return;

    let output = "";
    if (!this.outputText) {
      output += cursor.hide;
    }

    output += [
      this.value ? this.inactive : color.cyan().underline(this.inactive),
      color.gray("/"),
      this.value ? color.cyan().underline(this.active) : this.active,
    ].join(" ");

    super.render(output);
  }
}

module.exports = TogglePrompt;
