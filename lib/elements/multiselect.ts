import kleur from "kleur";
import { cursor } from "sisteransi";
import {
  clear,
  delimiter,
  entriesToDisplay,
  figures,
  symbol,
  wrap,
} from "../util";
import { Prompt, PromptOptions } from "./prompt";

export type MultiselectChoice = {
  title: string;
  value: any;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
}

export type MultiselectPromptOptions = PromptOptions & {
  choices: (string | Partial<MultiselectChoice>)[];
  hint?: string;
  warn?: string;
  max?: number;
  min?: number;
  cursor?: number;
  instructions?: boolean | string;
  optionsPerPage?: number;
  overrideRender?: boolean;
}

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
export class MultiselectPrompt extends Prompt<MultiselectChoice[]> {
  protected hint: string;
  protected warn: string;
  protected clear: string;
  protected minSelected?: number;
  protected maxChoices?: number;
  protected cursor: number = 0;
  protected scrollIndex: number = 0;
  protected optionsPerPage: number = 10;
  protected instructions?: boolean | string;
  protected showMinError: boolean = false;

  constructor(options: MultiselectPromptOptions) {
    super(options);

    this.cursor = options.cursor ?? 0;
    this.scrollIndex = this.cursor;
    this.hint = options.hint ?? "";
    this.warn = options.warn ?? "- This option is disabled -";
    this.minSelected = options.min;
    this.maxChoices = options.max;
    this.instructions = options.instructions;
    this.optionsPerPage = options.optionsPerPage ?? 10;

    this.value = options.choices.map((choice, index) => {
      if (typeof choice === "string") {
        return { title: choice, value: index };
      }

      return {
        title: choice.title ?? String(choice.value ?? index),
        value: choice.value ?? index,
        description: choice.description,
        selected: choice.selected,
        disabled: choice.disabled,
      };
    });

    this.clear = clear("", this.stdout.columns);
    if (!options.overrideRender) this.render();
  }

  protected get value(): MultiselectChoice[] {
    return this._value;
  }
  protected set value(value: MultiselectChoice[]) {
    this._value = value;
  }

  // BUG FIXED: Reset never reseted the options
  public reset(): void {
    this.value.forEach((val) => (val.selected = false));
    this.cursor = 0;
    this.fire();
    this.render();
  }

  public selected(): MultiselectChoice[] {
    return this.value.filter((val) => val.selected);
  }

  public exit(): void {
    this.abort();
  }

  public abort(): void {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  public submit(): void {
    const selected = this.value.filter((val) => val.selected);
    if (this.minSelected && selected.length < this.minSelected) {
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

  public first(): void {
    this.cursor = 0;
    this.render();
  }

  public last(): void {
    this.cursor = this.value.length - 1;
    this.render();
  }

  public next(): void {
    this.cursor = (this.cursor + 1) % this.value.length;
    this.render();
  }

  public up(): void {
    this.cursor = this.cursor === 0 ? this.value.length - 1 : this.cursor - 1;
    this.render();
  }

  public down(): void {
    this.cursor = this.cursor === this.value.length - 1 ? 0 : this.cursor + 1;
    this.render();
  }

  public left(): void {
    this.value[this.cursor].selected = false;
    this.render();
  }

  public right(): void {
    if (
      this.maxChoices !== undefined &&
      this.value.filter((val) => val.selected).length >= this.maxChoices
    ) {
      return this.bell();
    }

    this.value[this.cursor].selected = true;
    this.render();
  }

  protected handleSpaceToggle(): void {
    const value = this.value[this.cursor];

    // BUG FIXED: Allowed to deselect select disabled options
    // Probably disabled options shouldn't even have the state as selected
    if (
      value.disabled ||
      (this.maxChoices &&
        !value.selected &&
        this.value.filter((val) => val.selected).length >= this.maxChoices)
    ) {
      return this.bell();
    }

    value.selected = !value.selected;
    this.render();
  }

  protected toggleAll(): void {
    const value = this.value[this.cursor];

    // TODO: Max choices shouldn't prevent toggling all in case there is less then max
    if (this.maxChoices !== undefined || value.disabled) {
      return this.bell();
    }

    const newSelected = !value.selected;
    this.value
      .filter((v) => !v.disabled)
      .forEach((v) => (v.selected = newSelected));
    this.render();
  }

  protected _(char: string): void {
    switch (char) {
      case " ":
        this.handleSpaceToggle();
        break;

      case "a":
        this.toggleAll();
        break;

      default:
        this.bell();
        break;
    }
  }

  protected renderInstructions(): string {
    if (this.instructions === undefined || this.instructions === true) {
      return (
        "\nInstructions:\n" +
        `    ${figures.arrowUp}/${figures.arrowDown}: Highlight option\n` +
        `    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection\n` +
        (this.maxChoices === undefined ? `    a: Toggle all\n` : "") +
        `    enter/return: Complete answer`
      );
    }

    return typeof this.instructions === "string" ? this.instructions : "";
  }

  protected renderOption(
    cursor: number,
    value: MultiselectChoice,
    index: number,
    arrowIndicator: string,
  ): string {
    const prefix =
      (value.selected ? kleur.green(figures.radioOn) : figures.radioOff) +
      " " +
      arrowIndicator +
      " ";

    let title: string;
    let desc: string = "";

    if (value.disabled) {
      title =
        cursor === index
          ? kleur.gray().underline(value.title)
          : kleur.strikethrough().gray(value.title);
    } else {
      title =
        cursor === index ? kleur.cyan().underline(value.title) : value.title;

      if (cursor === index && value.description) {
        desc = ` - ${value.description}`;
        if (
          prefix.length + title.length + desc.length >= this.stdout.columns ||
          value.description.includes("\n")
        ) {
          desc =
            "\n" +
            wrap(value.description, {
              margin: prefix.length,
              width: this.stdout.columns,
            });
        }
      }
    }

    return prefix + title + kleur.gray(desc);
  }

  // shared with autocompleteMultiselect
  protected paginateOptions(options: MultiselectChoice[]): string {
    if (options.length === 0) {
      return kleur.red("No matches for this query.");
    }

    const { startIndex, endIndex } = entriesToDisplay(
      this.cursor,
      options.length,
      this.optionsPerPage,
    );

    let arrow;
    const lines: string[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (i === startIndex && startIndex > 0) {
        arrow = figures.arrowUp;
      } else if (i === endIndex - 1 && endIndex < options.length) {
        arrow = figures.arrowDown;
      } else {
        arrow = " ";
      }
      lines.push(this.renderOption(this.cursor, options[i], i, arrow));
    }

    return "\n" + lines.join("\n");
  }

  // shared with autocomleteMultiselect
  protected renderOptions(options: MultiselectChoice[]): string {
    return this.done ? "" : this.paginateOptions(options);
  }

  protected renderDoneOrInstructions(): string {
    if (this.done) {
      return this.value
        .filter((val) => val.selected)
        .map((val) => val.title)
        .join(", ");
    }

    const output = [kleur.gray(this.hint), this.renderInstructions()];
    if (this.value[this.cursor].disabled) {
      output.push(kleur.yellow(this.warn));
    }
    return output.join(" ");
  }

  public render(): void {
    if (this.closed) return;

    if (this.firstRender) this.stdout.write(cursor.hide);

    super.render();

    // print prompt
    let prompt = [
      symbol(this.done, this.aborted, false),
      kleur.bold(this.message),
      delimiter(false),
      this.renderDoneOrInstructions(),
    ].join(" ");

    if (this.showMinError) {
      prompt += kleur.red(
        `You must select a minimum of ${this.minSelected} choices.`,
      );
      this.showMinError = false;
    }
    prompt += this.renderOptions(this.value);

    this.stdout.write(this.clear + prompt);
    this.clear = clear(prompt, this.stdout.columns);
  }
}
