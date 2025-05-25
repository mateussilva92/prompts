import kleur from "kleur";
import { Key } from "readline";
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

export type SelectChoice = {
  title: string;
  value: any;
  description?: string;
  disabled?: boolean;
  selected?: boolean;
}

export type SelectPromptOptions = PromptOptions & {
  hint?: string;
  warn?: string;
  initial?: number;
  choices: (string | Partial<SelectChoice>)[];
  optionsPerPage?: number;
}

/**
 * SelectPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of choice objects
 * @param {String} [opts.hint] Hint to display
 * @param {Number} [opts.initial] Index of default value
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {Number} [opts.optionsPerPage=10] Max options to display at once
 */
export class SelectPrompt extends Prompt {
  protected hint: string;
  protected warn: string;
  protected clear: string;
  protected cursor: number = 0;
  protected choices: SelectChoice[] = [];
  protected optionsPerPage: number = 10;
  protected outputText: string = "";

  constructor(options: SelectPromptOptions) {
    super(options);

    this.hint = options.hint ?? "- Use arrow-keys. Return to submit.";
    this.warn = options.warn ?? "- This option is disabled";
    this.cursor = options.initial ?? 0;
    this.choices = options.choices.map((choice, index) => {
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

    this.optionsPerPage = options.optionsPerPage ?? 10;
    this.value = this.choices[this.cursor]?.value;
    this.clear = clear("", this.stdout.columns);

    this.render();
  }

  protected moveCursor(num: number): void {
    this.cursor = num;
    this.value = this.choices[num].value;
    this.fire();
  }

  public reset(): void {
    this.moveCursor(0);
    this.fire();
    this.render();
  }

  public exit(): void {
    this.abort();
  }

  public abort(): void {
    this.done = this.aborted = true;
    this.fire();
    this.render();
    this.close();
  }

  public submit(): void {
    if (!this.selection.disabled) {
      this.done = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.close();
    } else {
      this.bell();
    }
  }

  public first(): void {
    this.moveCursor(0);
    this.render();
  }

  public last(): void {
    this.moveCursor(this.choices.length - 1);
    this.render();
  }

  public up(): void {
    const len = this.choices.length;
    this.moveCursor((this.cursor - 1 + len) % len); // Wrap around
    this.render();
  }

  public down(): void {
    const len = this.choices.length;
    this.moveCursor((this.cursor + 1) % len); // Wrap around
    this.render();
  }

  public next(): void {
    this.down();
  }

  protected keyHandler(char: string, key: Key): void {
    if (char === " ") this.submit();
  }

  protected get selection(): SelectChoice {
    return this.choices[this.cursor];
  }

  render() {
    if (this.closed) return;

    if (this.firstRender) {
      this.stdout.write(cursor.hide);
    } else {
      this.stdout.write(clear(this.outputText, this.stdout.columns));
    }
    super.render();

    const { startIndex, endIndex } = entriesToDisplay(
      this.cursor,
      this.choices.length,
      this.optionsPerPage,
    );

    this.outputText = [
      symbol(this.done, this.aborted, false),
      kleur.bold(this.message),
      delimiter(false),
      this.done
        ? this.selection.title
        : this.selection.disabled
          ? kleur.yellow(this.warn)
          : kleur.gray(this.hint),
    ].join(" ");

    // Print choices
    if (!this.done) {
      this.outputText += "\n";
      for (let i = startIndex; i < endIndex; i++) {
        const choice = this.choices[i];
        let prefix = " ";
        let title: string;
        let desc = "";

        // Determine whether to display "more choices" indicators
        if (i === startIndex && startIndex > 0) {
          prefix = figures.arrowUp;
        } else if (i === endIndex - 1 && endIndex < this.choices.length) {
          prefix = figures.arrowDown;
        }

        if (choice.disabled) {
          title =
            this.cursor === i
              ? kleur.gray().underline(choice.title)
              : kleur.strikethrough().gray(choice.title);
          prefix =
            this.cursor === i
              ? kleur.bold().gray(figures.pointer) + " " + prefix
              : "  " + prefix;
        } else {
          title =
            this.cursor === i
              ? kleur.cyan().underline(choice.title)
              : choice.title;
          prefix =
            this.cursor === i
              ? kleur.cyan(figures.pointer) + " " + prefix
              : "  " + prefix;

          if (choice.description && this.cursor === i) {
            desc = ` - ${choice.description}`;
            if (
              prefix.length + title.length + desc.length >=
                this.stdout.columns ||
              choice.description.includes("\n")
            ) {
              desc =
                "\n" +
                wrap(choice.description, {
                  margin: 3,
                  width: this.stdout.columns,
                });
            }
          }
        }

        this.outputText += `${prefix} ${title}${kleur.gray(desc)}\n`;
      }
    }

    this.stdout.write(this.outputText);
  }
}
