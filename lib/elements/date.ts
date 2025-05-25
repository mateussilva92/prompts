import kleur from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import {
  DatePart,
  DatePartOptions,
  Day,
  Hours,
  Meridiem,
  Milliseconds,
  Minutes,
  Month,
  Seconds,
  Year,
} from "../dateparts";
import { clear, delimiter, figures, symbol } from "../util";
import { Prompt, PromptOptions } from "./prompt";

export type LocaleData = {
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
};
export type DatePromptOptions = PromptOptions & {
  initial?: Date;
  mask?: string;
  locales?: Partial<LocaleData>;
  error?: string;
  validate?: (val: Date) => boolean | string | Promise<boolean | string>;
}

const defaultLocales: LocaleData = {
  months:
    "January,February,March,April,May,June,July,August,September,October,November,December".split(
      ",",
    ),
  monthsShort: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec".split(","),
  weekdays: "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(
    ",",
  ),
  weekdaysShort: "Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(","),
};

const regex =
  /\\(.)|"((?:\\["\\]|[^"])+)"|(D[Do]?|d{3,4}|d)|(M{1,4})|(YY(?:YY)?)|([aA])|([Hh]{1,2})|(m{1,2})|(s{1,2})|(S{1,4})|./g;

const regexGroups: Record<
  number,
  (options: DatePartOptions) => DatePart | string
> = {
  1: ({ token }) => token.replace(/\\(.)/g, "$1"),
  2: (options) => new Day(options), // Day // TODO
  3: (options) => new Month(options), // Month
  4: (options) => new Year(options), // Year
  5: (options) => new Meridiem(options), // AM/PM // TODO (special)
  6: (options) => new Hours(options), // Hours
  7: (options) => new Minutes(options), // Minutes
  8: (options) => new Seconds(options), // Seconds
  9: (options) => new Milliseconds(options), // Fractional seconds
};

/**
 * DatePrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Number} [opts.initial] Index of default value
 * @param {String} [opts.mask] The format mask
 * @param {object} [opts.locales] The date locales
 * @param {String} [opts.error] The error message shown on invalid value
 * @param {Function} [opts.validate] Function to validate the submitted value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
export class DatePrompt extends Prompt<Date> {
  protected cursor: number = 0;
  protected clear: string;
  protected typed: string = "";
  protected locales: LocaleData;
  protected validator: NonNullable<DatePromptOptions["validate"]>;
  protected errorMsg: string;
  protected _date: Date;
  protected parts: (DatePart | string)[] = [];
  protected error: boolean = false;

  constructor(options: DatePromptOptions) {
    super(options);

    this.locales = { ...defaultLocales, ...options.locales };
    this._date = options.initial ?? new Date();
    this.validator = options.validate || (() => true);
    this.errorMsg = options.error || "Please Enter A Valid Value";
    this.mask = options.mask || "YYYY-MM-DD HH:mm:ss";
    this.clear = clear("", this.stdout.columns);

    this.render();
  }

  public get value(): Date {
    return this.date;
  }

  public get date(): Date {
    return this._date;
  }

  public set date(date: Date) {
    if (date) this._date.setTime(date.getTime());
  }

  public set mask(mask: string) {
    let result: RegExpExecArray | null;
    this.parts = [];

    while ((result = regex.exec(mask))) {
      const match = result.shift();
      const idx = result.findIndex((gr) => gr != null);

      this.parts.push(
        idx in regexGroups
          ? regexGroups[idx]!({
              token: result[idx] ?? match,
              date: this.date,
              parts: this.parts,
              locales: this.locales,
            })
          : (result[idx] ?? match),
      );
    }

    const collapsed = this.parts.reduce<(DatePart | string)[]>((acc, curr) => {
      if (typeof curr === "string" && typeof acc[acc.length - 1] === "string") {
        acc[acc.length - 1] += curr;
      } else {
        acc.push(curr);
      }
      return acc;
    }, []);

    this.parts = collapsed;
    this.reset();
  }

  protected moveCursor(num: number): void {
    this.typed = "";
    this.cursor = num;
    this.fire();
  }

  public reset(): void {
    this.moveCursor(this.parts.findIndex((part) => part instanceof DatePart));
    this.fire();
    this.render();
  }

  public exit(): void {
    this.abort();
  }

  public abort(): void {
    this.done = this.aborted = true;
    this.error = false;
    this.fire();
    this.render();
    this.close();
  }

  public async validate(): Promise<void> {
    let valid = await this.validator(this.value);
    if (typeof valid === "string") {
      this.errorMsg = valid;
      valid = false;
    }
    this.error = !valid;
  }

  public async submit(): Promise<void> {
    await this.validate();
    if (this.error) {
      this.fire();
      this.render();
      return;
    }
    this.done = true;
    this.aborted = false;
    this.fire();
    this.render();
    this.close();
  }

  public up(): void {
    this.typed = "";
    (this.parts[this.cursor] as DatePart).up();
    this.render();
  }

  public down(): void {
    this.typed = "";
    (this.parts[this.cursor] as DatePart).down();
    this.render();
  }

  public left(): void {
    const prev = (this.parts[this.cursor] as DatePart).prev();
    if (prev == null) return this.bell();
    this.moveCursor(this.parts.indexOf(prev));
    this.render();
  }

  public right(): void {
    const next = (this.parts[this.cursor] as DatePart).next();
    if (next == null) return this.bell();
    this.moveCursor(this.parts.indexOf(next));
    this.render();
  }

  public next(): void {
    const next = (this.parts[this.cursor] as DatePart).next();
    this.moveCursor(
      next
        ? this.parts.indexOf(next)
        : this.parts.findIndex((part) => part instanceof DatePart),
    );
    this.render();
  }

  protected keyHandler(char: string, key: Key) {
    if (/\d/.test(char)) {
      this.typed += char;
      (this.parts[this.cursor] as DatePart).setTo(this.typed);
      this.render();
    }
  }

  public render(): void {
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
      delimiter(false),
      this.parts
        .reduce<string[]>((arr, p, idx) => {
          arr.push(
            idx === this.cursor && !this.done
              ? kleur.cyan().underline(p.toString())
              : p.toString(),
          );
          return arr;
        }, [])
        .join(""),
    ].join(" ");

    if (this.error) {
      this.outputText += this.errorMsg
        .split("\n")
        .reduce(
          (acc, line, i) =>
            acc +
            `\n${i ? " " : figures.pointerSmall} ${kleur.red().italic(line)}`,
          "",
        );
    }

    this.stdout.write(erase.line + cursor.to(0) + this.outputText);
  }
}
