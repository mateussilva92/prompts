import kleur from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import { clear, delimiter, symbol } from "../util";
import { Prompt, PromptOptions } from "./prompt";

type TogglePromptOptions = PromptOptions & {
  message: string;
  initial: boolean;
  active?: string;
  inactive?: string;
};

/**
 * A toggle prompt that switches between two states (on/off).
 */
export class TogglePrompt extends Prompt<boolean> {
  protected message: string;
  protected active: string;
  protected inactive: string;
  protected initialValue: boolean;

  constructor(options: TogglePromptOptions) {
    super(options);

    this.message = options.message;
    this.value = !!options.initial;
    this.active = options.active || "on";
    this.inactive = options.inactive || "off";
    this.initialValue = this.value;

    this.render();
  }

  protected reset() {
    this.value = this.initialValue;
    this.fire();
    this.render();
  }

  protected exit() {
    this.abort();
  }

  protected abort() {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  protected submit() {
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  protected deactivate() {
    if (this.value === false) return this.bell();
    this.value = false;
    this.render();
  }

  protected activate() {
    if (this.value === true) return this.bell();
    this.value = true;
    this.render();
  }

  protected delete() {
    this.deactivate();
  }
  protected left() {
    this.deactivate();
  }
  protected right() {
    this.activate();
  }
  protected down() {
    this.deactivate();
  }
  protected up() {
    this.activate();
  }

  protected next() {
    this.value = !this.value;
    this.fire();
    this.render();
  }

  protected keyHandler(char: string, key: Key) {
    switch (char) {
      case " ":
        this.value = !this.value;
        break;

      case "1":
        this.value = true;
        break;

      case "0":
        this.value = false;
        break;

      default:
        return this.bell();
    }

    super.keyHandler(char, key);
  }

  render() {
    if (this.closed) return;

    if (this.firstRender) this.stdout.write(cursor.hide);
    else this.stdout.write(clear(this.outputText, this.stdout.columns));
    super.render();

    this.outputText = [
      symbol(this.done, this.aborted, false),
      kleur.bold(this.message),
      delimiter(this.done),
      this.value ? this.inactive : kleur.cyan().underline(this.inactive),
      kleur.gray("/"),
      this.value ? kleur.cyan().underline(this.active) : this.active,
    ].join(" ");

    this.stdout.write(erase.line + cursor.to(0) + this.outputText);
  }
}
