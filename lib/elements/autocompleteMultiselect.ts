import kleur from "kleur";
import { Key } from "readline";
import { cursor } from "sisteransi";
import { clear, delimiter, figures, symbol } from "../util";
import {
  MultiselectChoice,
  MultiselectPrompt,
  MultiselectPromptOptions,
} from "./multiselect";
/**
 * MultiselectPrompt Base Element
 * @param {Object} options Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {String} [opts.warn] Hint shown for disabled choices
 * @param {Number} [opts.max] Max choices
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 */
export class AutocompleteMultiselectPrompt extends MultiselectPrompt {
  protected inputValue = "";
  protected filteredOptions: MultiselectChoice[] = [];

  constructor(options: MultiselectPromptOptions) {
    options.overrideRender = true;
    super(options);

    this.clear = clear("", this.stdout.columns);
    this.filteredOptions = this.value;
    this.render();
  }

  public last(): void {
    this.cursor = this.filteredOptions.length - 1;
    this.render();
  }

  public next(): void {
    this.cursor = (this.cursor + 1) % this.filteredOptions.length;
    this.render();
  }

  public up(): void {
    this.cursor =
      this.cursor === 0 ? this.filteredOptions.length - 1 : this.cursor - 1;
    this.render();
  }

  public down(): void {
    this.cursor =
      this.cursor === this.filteredOptions.length - 1 ? 0 : this.cursor + 1;
    this.render();
  }

  public left(): void {
    this.filteredOptions[this.cursor].selected = false;
    this.render();
  }

  public right(): void {
    if (
      this.value.filter((item) => item.selected).length >=
      (this.maxChoices ?? Infinity)
    ) {
      return this.bell();
    }

    this.filteredOptions[this.cursor].selected = true;
    this.render();
  }

  public delete(): void {
    if (this.inputValue.length) {
      this.inputValue = this.inputValue.slice(0, -1);
      this.updateFilteredOptions();
    }
  }

  protected updateFilteredOptions(): void {
    const current = this.filteredOptions[this.cursor];
    const keyword = this.inputValue.toLowerCase();

    this.filteredOptions = this.value.filter((val) => {
      return (
        !keyword ||
        (typeof val.title === "string" &&
          val.title.toLowerCase().includes(keyword)) ||
        (typeof val.value === "string" &&
          val.value.toLowerCase().includes(keyword))
      );
    });

    const index = this.filteredOptions.findIndex(
      (option) => option === current,
    );
    this.cursor = Math.max(0, index);
    this.render();
  }

  protected handleSpaceToggle(): void {
    const value = this.filteredOptions[this.cursor];

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

  protected handleInputChange(char: string): void {
    this.inputValue += char;
    this.updateFilteredOptions();
  }

  protected keyHandler(char: string, key: Key): void {
    if (char === " ") {
      this.handleSpaceToggle();
    } else {
      this.handleInputChange(char);
    }
  }

  protected renderInstructions(): string {
    if (this.instructions === undefined || this.instructions === true) {
      return `
Instructions:
    ${figures.arrowUp}/${figures.arrowDown}: Highlight option
    ${figures.arrowLeft}/${figures.arrowRight}/[space]: Toggle selection
    [a,b,c]/delete: Filter choices
    enter/return: Complete answer
`;
    }

    return typeof this.instructions === "string" ? this.instructions : "";
  }

  protected renderCurrentInput(): string {
    return `\nFiltered results for: ${
      this.inputValue || kleur.gray("Enter something to filter")
    }\n`;
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

    let title;
    if (value.disabled) {
      title =
        cursor === index
          ? kleur.gray().underline(value.title)
          : kleur.strikethrough().gray(value.title);
    } else {
      title =
        cursor === index ? kleur.cyan().underline(value.title) : value.title;
    }

    return prefix + title;
  }

  protected renderDoneOrInstructions(): string {
    if (this.done) {
      return this.value
        .filter((val) => val.selected)
        .map((val) => val.title)
        .join(", ");
    }

    const output = [
      kleur.gray(this.hint),
      this.renderInstructions(),
      this.renderCurrentInput(),
    ];

    if (
      this.filteredOptions.length &&
      this.filteredOptions[this.cursor]?.disabled
    ) {
      output.push(kleur.yellow(this.warn));
    }

    return output.join(" ");
  }

  public render(): void {
    if (this.closed) return;
    if (this.firstRender) this.stdout.write(cursor.hide);

    super.render();

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
    prompt += this.renderOptions(this.filteredOptions);

    this.stdout.write(this.clear + prompt);
    this.clear = clear(prompt, this.stdout.columns);
  }
}
