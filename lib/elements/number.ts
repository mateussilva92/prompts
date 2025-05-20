import kleur, { Kleur } from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import { clear, delimiter, figures, lines, render, symbol } from "../util";
import { Prompt, PromptOptions } from "./prompt";

const isNumber = /[0-9]/;
const isDef = (val: unknown): boolean => val !== undefined;
const round = (number: number, precision: number): number => {
  let factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
};

export interface NumberPromptOptions extends PromptOptions {
  message: string;
  initial?: number;
  min?: number;
  max?: number;
  float?: boolean;
  round?: number;
  increment?: number;
  style?: string;
  validate?: (val: number) => boolean | string | Promise<boolean | string>;
  error?: string;
}

/**
 * NumberPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {String} [opts.style='default'] Render style
 * @param {Number} [opts.initial] Default value
 * @param {Number} [opts.max=+Infinity] Max value
 * @param {Number} [opts.min=-Infinity] Min value
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {Function} [opts.validate] Validate function
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.error] The invalid error label
 */
export class NumberPrompt extends Prompt<number | ""> {
  protected message: string;
  protected initial: number | "";
  protected float: boolean;
  protected round: number;
  protected inc: number;
  protected min: number;
  protected max: number;
  protected errorMsg: string;
  protected validator: NonNullable<NumberPromptOptions["validate"]>;
  protected color: keyof Kleur = "cyan";
  protected placeholder: boolean = true;
  protected rendered: string = "";
  protected typed: string = "";
  protected lastHit: number = 0;
  protected transform: { render: (val: string) => string } = {
    render: (v) => v,
  };
  protected outputError: string = "";
  protected outputText: string = "";
  protected done: boolean = false;
  protected error: boolean = false;

  constructor(options: NumberPromptOptions) {
    super(options);

    this.transform = render(options.style || "default");
    this.message = options.message;
    this.initial = isDef(options.initial) ? options.initial! : "";
    this.float = !!options.float;
    this.round = options.round || 2; // TODO: Test and revisit this, could be ??
    this.inc = options.increment || 1; // TODO: Test and revisit this, could be ??
    this.min = isDef(options.min) ? options.min! : -Infinity;
    this.max = isDef(options.max) ? options.max! : Infinity;
    this.errorMsg = options.error || "Please Enter A Valid Value";
    this.validator = options.validate || (() => true);

    this.value = "";
    this.render();
  }

  get value(): number | "" {
    return this._value;
  }

  set value(val: number | "") {
    if (!val && val !== 0) {
      this.placeholder = true;
      this.rendered = kleur.gray(this.transform.render(`${this.initial}`));
      this._value = "";
    } else {
      this.placeholder = false;
      const roundVal = round(val, this.round);

      this.rendered = this.transform.render(`${roundVal}`);
      this._value = roundVal;
    }
    this.fire();
  }

  parse(val: string): number {
    return this.float ? parseFloat(val) : parseInt(val);
  }

  valid(char: string): boolean {
    return char === "-" || (char === "." && this.float) || isNumber.test(char);
  }

  reset(): void {
    this.typed = "";
    this.value = "";
    this.fire();
    this.render();
  }

  exit(): void {
    this.abort();
  }

  abort(): void {
    const val = this.value;
    this.value = val !== "" ? val : this.initial;
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.stdout.write(`\n`);
    this.close();
  }

  async validate(): Promise<void> {
    let valid = await this.validator(this.value as number);
    if (typeof valid === "string") {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  async submit(): Promise<void> {
    await this.validate();
    if (this.error) {
      this.color = "red";
      this.fire();
      this.render();
      return;
    }
    const val = this.value;
    this.value = val !== "" ? val : this.initial;
    this.done = true;
    this.aborted = false;
    this.error = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  up(): void {
    this.typed = "";
    if (this.value === "") {
      this.value = this.min === -Infinity ? 0 - this.inc : this.min - this.inc;
    }
    if ((this.value as number) >= this.max) return this.bell();
    this.value = (this.value as number) + this.inc;
    this.color = "cyan";
    this.fire();
    this.render();
  }

  down(): void {
    this.typed = "";
    if (this.value === "") {
      this.value = this.min === -Infinity ? 0 + this.inc : this.min + this.inc;
    }
    if ((this.value as number) <= this.min) return this.bell();
    this.value = (this.value as number) - this.inc;
    this.color = "cyan";
    this.fire();
    this.render();
  }

  delete(): void {
    let val = this.value.toString();
    if (!val.length) return this.bell();

    const newVal = val.slice(0, -1);
    this.value = this.parse(newVal) || "";
    if (this.value !== "" && this.value < this.min) {
      this.value = this.min === -Infinity ? 0 : this.min;
    }
    this.color = "cyan";
    this.fire();
    this.render();
  }

  next(): void {
    this.value = this.initial;
    this.fire();
    this.render();
  }

  protected keyHandler(char: string, key: Key) {
    if (!this.valid(char)) return this.bell();

    const now = Date.now();
    if (now - this.lastHit > 1000) this.typed = ""; // 1s elapsed
    this.typed += char;
    this.lastHit = now;
    this.color = "cyan";

    if (char === ".") {
      this.fire();
      return;
    }

    const parsed = this.parse(this.typed);
    // Make sure the value is in the range of min and max
    this.value = Math.min(Math.max(parsed, this.min), this.max);
    this.fire();
    this.render();
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
      !this.done || (!this.done && !this.placeholder)
        ? kleur[this.color]().underline(this.rendered)
        : this.rendered,
    ].join(" ");

    // Print error
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
        cursor.restore,
    );
  }
}
