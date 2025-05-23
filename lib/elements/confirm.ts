import kleur from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import { clear, delimiter, symbol } from "../util";
import { Prompt, PromptOptions } from "./prompt";

export type ConfirmPromptOptions = PromptOptions & {
  message: string;
  initial: boolean;
  yes?: string;
  yesOption?: string;
  no?: string;
  noOption?: string;
};

/**
 * ConfirmPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Boolean} [opts.initial] Default value (true/false)
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.yes] The "Yes" label
 * @param {String} [opts.yesOption] The "Yes" option when choosing between yes/no
 * @param {String} [opts.no] The "No" label
 * @param {String} [opts.noOption] The "No" option when choosing between yes/no
 */
export class ConfirmPrompt extends Prompt<boolean> {
  protected message: string;
  protected yesMessage: string;
  protected yesOption: string;
  protected noMessage: string;
  protected noOption: string;
  protected initialValue: boolean;

  constructor(options: ConfirmPromptOptions) {
    super(options);

    this.message = options.message;
    this.value = options.initial;
    this.initialValue = this.value;
    this.yesMessage = options.yes || "yes";
    this.yesOption = options.yesOption || "(Y/n)";
    this.noMessage = options.no || "no";
    this.noOption = options.noOption || "(y/N)";
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
    this.value = this.value || false;
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  keyHandler(char: string, key: Key) {
    switch (char.toLowerCase()) {
      case "y":
        this.value = true;
        break;

      case "n":
        this.value = false;
        break;

      default:
        this.bell();
        return;
    }

    this.submit();
  }

  render() {
    if (this.closed) return;

    if (this.firstRender) {
      this.stdout.write(cursor.hide);
    } else {
      this.stdout.write(clear(this.outputText, this.stdout.columns));
    }
    super.render();

    this.outputText = [
      symbol(this.done, this.aborted, false),
      kleur.bold(this.message),
      delimiter(this.done),
      this.done
        ? this.value
          ? this.yesMessage
          : this.noMessage
        : kleur.gray(this.initialValue ? this.yesOption : this.noOption),
    ].join(" ");

    this.stdout.write(erase.line + cursor.to(0) + this.outputText);
  }
}
