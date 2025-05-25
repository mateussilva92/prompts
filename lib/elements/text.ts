import kleur from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import { clear, delimiter, figures, lines, render, symbol } from "../util";
import { Prompt, PromptOptions } from "./prompt";

export interface TextPromptOptions extends PromptOptions {
  message: string;
  style?: string;
  initial?: string;
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
  error?: string;
}

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
export class TextPrompt extends Prompt<string> {
  protected message: string;
  protected initial: string;
  protected transform: ReturnType<typeof render>;
  protected scale: number;
  protected validator: NonNullable<TextPromptOptions["validate"]>;
  protected errorMsg: string;
  protected cursor: number;
  protected cursorOffset: number;
  protected clear: string;
  protected red: boolean = false;
  protected placeholder: boolean = true;
  protected rendered: string = "";
  protected outputText: string = "";
  protected outputError: string = "";
  protected done: boolean = false;
  protected error: boolean = false;

  constructor(options: TextPromptOptions) {
    super(options);

    this.message = options.message;
    this.transform = render(options.style || "default");
    this.scale = this.transform.scale;
    this.initial = options.initial ?? "";
    this.validator = options.validate ?? (() => true);
    this.errorMsg = options.error || "Please Enter A Valid Value";
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.clear = clear("", this.stdout.columns);

    this.value = "";

    this.render();
  }

  protected set value(val) {
    if (!val && this.initial) {
      this.placeholder = true;
      this.rendered = kleur.gray(this.transform.render(this.initial));
    } else {
      this.placeholder = false;
      this.rendered = this.transform.render(val);
    }
    this._value = val;
    this.fire();
  }

  protected get value() {
    return this._value;
  }

  protected reset(): void {
    this.value = "";
    this.cursor = Number(!!this.initial);
    this.cursorOffset = 0;
    this.fire();
    this.render();
  }

  protected exit(): void {
    this.abort();
  }

  public abort(): void {
    this.value = this.value || this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.red = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  protected async validate() {
    let valid = await this.validator(this.value);
    if (typeof valid === "string") {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  protected async submit(): Promise<void> {
    this.value = this.value || this.initial;
    this.cursorOffset = 0;
    this.cursor = this.rendered.length;
    await this.validate();

    if (this.error) {
      this.red = true;
      this.fire();
      this.render();
      return;
    }

    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  protected next(): void {
    if (!this.placeholder) return this.bell();
    this.value = this.initial;
    this.cursor = this.rendered.length;
    this.fire();
    this.render();
  }

  moveCursor(num: number): void {
    if (this.placeholder) return;
    this.cursor = this.cursor + num;
    this.cursorOffset += num;
  }

  keyHandler(char: string, key: Key): void {
    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${char}${s2}`;
    this.red = false;
    this.cursor = this.placeholder ? 0 : s1.length + 1;
    this.render();
  }

  delete(): void {
    if (this.isCursorAtStart()) return this.bell();
    let s1 = this.value.slice(0, this.cursor - 1);
    let s2 = this.value.slice(this.cursor);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtStart()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
      this.moveCursor(-1);
    }

    this.render();
  }

  deleteForward(): void {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) {
      return this.bell();
    }

    let s1 = this.value.slice(0, this.cursor);
    let s2 = this.value.slice(this.cursor + 1);
    this.value = `${s1}${s2}`;
    this.red = false;

    if (this.isCursorAtEnd()) {
      this.cursorOffset = 0;
    } else {
      this.cursorOffset++;
    }

    this.render();
  }

  first(): void {
    this.cursor = 0;
    this.render();
  }

  last(): void {
    this.cursor = this.value.length;
    this.render();
  }

  left(): void {
    if (this.cursor <= 0 || this.placeholder) return this.bell();
    this.moveCursor(-1);
    this.render();
  }

  right(): void {
    if (this.cursor * this.scale >= this.rendered.length || this.placeholder) {
      return this.bell();
    }
    this.moveCursor(1);
    this.render();
  }

  protected isCursorAtStart(): boolean {
    return this.cursor === 0 || (this.placeholder && this.cursor === 1);
  }

  protected isCursorAtEnd(): boolean {
    return (
      this.cursor === this.rendered.length ||
      (this.placeholder && this.cursor === this.rendered.length + 1)
    );
  }

  render(): void {
    if (this.closed) return;

    if (!this.firstRender) {
      if (this.outputError)
        this.stdout.write(
          cursor.down(lines(this.outputError, this.stdout.columns) - 1) +
            clear(this.outputError, this.stdout.columns),
        );
      this.stdout.write(clear(this.outputText, this.stdout.columns));
    }

    super.render();
    this.outputError = "";

    this.outputText = [
      symbol(this.done, this.aborted, false),
      kleur.bold(this.message),
      delimiter(this.done),
      this.red ? kleur.red(this.rendered) : this.rendered,
    ].join(" ");

    if (this.error) {
      this.outputError += this.errorMsg
        .split("\n")
        .reduce(
          (acc, line, i) =>
            acc +
            `\n${i ? " " : figures.pointerSmall} ${kleur.red().italic(line)}`,
          "",
        );
    }

    this.stdout.write(
      erase.line +
        cursor.to(0) +
        this.outputText +
        cursor.save +
        this.outputError +
        cursor.restore +
        cursor.move(this.cursorOffset, 0),
    );
  }
}
