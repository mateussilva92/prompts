import kleur from "kleur";
import { Key } from "readline";
import { cursor, erase } from "sisteransi";
import {
  clear,
  delimiter,
  entriesToDisplay,
  figures,
  render,
  symbol,
  wrap,
} from "../util";
import { Prompt, PromptOptions } from "./prompt";

export type AutocompleteChoice = {
  title: string;
  value: any;
  description?: string;
}

export type AutocompletePromptOptions = PromptOptions & {
  choices: (string | Partial<AutocompleteChoice>)[];
  suggest: (
    input: string,
    choices: AutocompleteChoice[],
  ) => Promise<AutocompleteChoice[]>;
  limit?: number;
  cursor?: number;
  style?: string;
  fallback?: string | number | AutocompleteChoice;
  initial?: number | string;
  clearFirst?: boolean;
  noMatches?: string;
}

function getVal(items: any[], index: number) {
  return (
    items[index] && (items[index].value ?? items[index].title ?? items[index])
  );
}
const getTitle = (items: any[], index: number) =>
  items[index] && (items[index].title ?? items[index].value ?? items[index]);

function getIndex(items: any[], valOrTitle: string | number | undefined) {
  if (valOrTitle === undefined) return undefined;

  const index = items.findIndex(
    (item) => item.value === valOrTitle || item.title === valOrTitle,
  );
  return index > -1 ? index : undefined;
}

/**
 * TextPrompt Base Element
 * @param {Object} opts Options
 * @param {String} opts.message Message
 * @param {Array} opts.choices Array of auto-complete choices objects
 * @param {Function} [opts.suggest] Filter function. Defaults to sort by title
 * @param {Number} [opts.limit=10] Max number of results to show
 * @param {Number} [opts.cursor=0] Cursor start position
 * @param {String} [opts.style='default'] Render style
 * @param {String} [opts.fallback] Fallback message - initial to default value
 * @param {String} [opts.initial] Index of the default value
 * @param {Boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {Stream} [opts.stdin] The Readable stream to listen to
 * @param {Stream} [opts.stdout] The Writable stream to write readline data to
 * @param {String} [opts.noMatches] The no matches found label
 */

export class AutocompletePrompt extends Prompt<any> {
  protected choices: AutocompleteChoice[] = [];
  protected suggest: AutocompletePromptOptions["suggest"];
  protected fallbackValue: string | number | AutocompleteChoice = "";
  protected _fb: any;
  protected clear: string;
  protected input: string = "";
  protected suggestions: AutocompleteChoice[] = [];
  protected initial?: number;
  protected select: number = 0;
  protected limit: number = 10;
  protected cursor: number = 0;
  protected transform: ReturnType<typeof render>;
  protected scale: number;
  protected completing: Promise<any> | false = false;
  protected i18n: { noMatches: string };
  protected clearFirst: boolean;
  protected rendered: string = "";

  constructor(options: AutocompletePromptOptions) {
    super(options);

    this.choices = options.choices;

    this.suggest = options.suggest;
    this.initial =
      typeof options.initial === "number"
        ? options.initial
        : getIndex(this.choices, options.initial);
    this.select = this.initial ?? options.cursor ?? 0;
    this.fallback = options.fallback ?? this.initial;
    this.limit = options.limit || 10;
    this.clearFirst = options.clearFirst ?? false;
    this.i18n = { noMatches: options.noMatches ?? "no matches found" };
    this.transform = render(options.style ?? "default");
    this.scale = this.transform.scale;

    this.render = this.render.bind(this);
    this.complete = this.complete.bind(this);
    this.clear = clear("", this.stdout.columns);

    this.complete(this.render);
    this.render();
  }

  public set fallback(fb: string | number | AutocompleteChoice) {
    const strFallback = String(fb);

    this._fb = Number.isSafeInteger(parseInt(strFallback))
      ? parseInt(strFallback)
      : fb;
  }

  get fallback(): AutocompleteChoice {
    switch (typeof this._fb) {
      case "number":
        return (
          this.choices[this._fb] ?? { title: this.i18n.noMatches, value: null }
        );

      case "string":
        return { title: this._fb, value: this._fb };

      default:
        return this._fb ?? { title: this.i18n.noMatches, value: null };
    }
  }

  protected moveSelect(index: number): void {
    this.select = index;
    this.value =
      this.suggestions.length > 0
        ? getVal(this.suggestions, this.select)
        : this.fallback.value;
    this.fire();
  }

  protected async complete(callback?: () => void): Promise<void> {
    const promise = (this.completing = this.suggest(this.input, this.choices));
    const suggestions = await promise;
    if (this.completing !== promise) return; // New promise is in progress so we can ignore this one

    this.suggestions = suggestions.map((suggestion, index, items) => ({
      title: getTitle(items, index),
      value: getVal(items, index),
      description: suggestion.description,
    }));

    this.completing = false;

    // Get the select value on the range of the suggestions
    const select = Math.min(Math.max(suggestions.length - 1, 0), this.select);
    this.moveSelect(select);

    callback?.();
  }

  public reset(): void {
    this.input = "";
    this.complete(() => {
      this.moveSelect(this.initial ?? 0);
      this.render();
    });
    this.render();
  }

  public exit(): void {
    if (this.clearFirst && this.input.length > 0) {
      this.reset();
    } else {
      this.done = this.exited = true;
      this.aborted = false;
      this.fire();
      this.render();
      this.stdout.write("\n");
      this.close();
    }
  }

  public abort(): void {
    this.done = this.aborted = true;
    this.exited = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  public submit(): void {
    this.done = true;
    this.aborted = this.exited = false;
    this.fire();
    this.render();
    this.stdout.write("\n");
    this.close();
  }

  protected keyHandler(char: string, key: Key): void {
    const s1 = this.input.slice(0, this.cursor);
    const s2 = this.input.slice(this.cursor);
    this.input = s1 + char + s2;
    this.cursor = s1.length + 1;
    this.complete(this.render); //TODO: Check if we need to use this.complete(this.render.bind(this));
    this.render();
  }

  public delete(): void {
    if (this.cursor === 0) return this.bell();
    const s1 = this.input.slice(0, this.cursor - 1);
    const s2 = this.input.slice(this.cursor);
    this.input = s1 + s2;
    this.cursor--;
    this.complete(this.render); //TODO: Check if we need to use this.complete(this.render.bind(this));
    this.render();
  }

  public deleteForward(): void {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    const s1 = this.input.slice(0, this.cursor);
    const s2 = this.input.slice(this.cursor + 1);
    this.input = s1 + s2;
    this.complete(this.render); //TODO: Check if we need to use this.complete(this.render.bind(this));
    this.render();
  }

  public first(): void {
    this.moveSelect(0);
    this.render();
  }

  public last(): void {
    this.moveSelect(this.suggestions.length - 1);
    this.render();
  }

  public up(): void {
    const len = this.suggestions.length;
    this.moveSelect(this.select === 0 ? len - 1 : this.select - 1);
    this.render();
  }

  public down(): void {
    const len = this.suggestions.length;
    this.moveSelect(this.select === len - 1 ? 0 : this.select + 1);
    this.render();
  }

  public next(): void {
    this.down();
  }

  public nextPage(): void {
    const next = Math.min(
      this.select + this.limit,
      this.suggestions.length - 1,
    );
    this.moveSelect(next);
    this.render();
  }

  public prevPage(): void {
    const prev = Math.max(this.select - this.limit, 0);
    this.moveSelect(prev);
    this.render();
  }

  public left(): void {
    if (this.cursor <= 0) return this.bell();
    this.cursor--;
    this.render();
  }

  public right(): void {
    if (this.cursor * this.scale >= this.rendered.length) return this.bell();
    this.cursor++;
    this.render();
  }

  protected renderOption(
    value: AutocompleteChoice,
    hovered: boolean,
    isStart: boolean,
    isEnd: boolean,
  ): string {
    let desc = "";
    let prefix = isStart ? figures.arrowUp : isEnd ? figures.arrowDown : " ";
    let title = hovered ? kleur.cyan().underline(value.title) : value.title;
    prefix = (hovered ? kleur.cyan(figures.pointer) + " " : "  ") + prefix;

    if (value.description) {
      desc = ` - ${value.description}`;
      if (
        prefix.length + title.length + desc.length >= this.stdout.columns ||
        value.description.includes("\n")
      ) {
        desc =
          "\n" +
          wrap(value.description, { margin: 3, width: this.stdout.columns });
      }
    }
    return `${prefix} ${title}${kleur.gray(desc)}`;
  }

  public render(): void {
    if (this.closed) return;

    if (this.firstRender) this.stdout.write(cursor.hide);
    else this.stdout.write(clear(this.outputText, this.stdout.columns));
    super.render();

    const { startIndex, endIndex } = entriesToDisplay(
      this.select,
      this.choices.length,
      this.limit,
    );

    this.outputText = [
      symbol(this.done, this.aborted, this.exited),
      kleur.bold(this.message),
      delimiter(Boolean(this.completing)),
      this.done && this.suggestions[this.select]
        ? this.suggestions[this.select].title
        : (this.rendered = this.transform.render(this.input)),
    ].join(" ");

    if (!this.done) {
      const suggestions = this.suggestions
        .slice(startIndex, endIndex)
        .map((item, index) =>
          this.renderOption(
            item,
            this.select === index + startIndex,
            index === 0 && startIndex > 0,
            index + startIndex === endIndex - 1 &&
              endIndex < this.choices.length,
          ),
        )
        .join("\n");
      this.outputText +=
        `\n` + (suggestions || kleur.gray(this.fallback.title));
    }

    this.stdout.write(erase.line + cursor.to(0) + this.outputText);
  }
}
