import {
  AutocompletePromptOptions,
  ConfirmPromptOptions,
  DatePromptOptions,
  MultiselectPromptOptions,
  NumberPromptOptions,
  prompts,
  SelectPromptOptions,
  TextPromptOptions,
  TogglePromptOptions,
} from "./elements";
import { Prompt } from "./elements/prompt";

type Elements = typeof prompts;

// Helper to extract constructor parameters
type ConstructorArgs<T> = T extends new (args: infer A) => any ? A : never;

// Helper to extract Prompt result type
type PromptResult<T> = T extends Prompt<infer R> ? R : never;

type PromptOptions<T> = {
  onSubmit?: (value: T) => any;
  onAbort?: (value: T) => any;
  onExit?: (value: T) => any;
  onState?: (state: any) => void;
};

const noop = <T>(val: T) => val;

function toPrompt<K extends keyof Elements>(
  type: K,
  args: ConstructorArgs<Elements[K]>,
  options: PromptOptions<PromptResult<InstanceType<Elements[K]>>> = {},
): Promise<PromptResult<InstanceType<Elements[K]>>> {
  return new Promise((res, rej) => {
    // cast prompts[type] to the constructor type of Elements[K]
    const PromptClass = prompts[type] as unknown as new (
      args: ConstructorArgs<Elements[K]>,
    ) => InstanceType<Elements[K]>;
    const prompt = new PromptClass(args);

    const onState = options.onState ?? noop;
    const onAbort = options.onAbort ?? noop;
    const onSubmit = options.onSubmit ?? noop;
    const onExit = options.onExit ?? noop;

    prompt.on("state", onState);
    prompt.on("submit", (x) => res(onSubmit(x)));
    prompt.on("exit", (x) => res(onExit(x)));
    prompt.on("abort", (x) => rej(onAbort(x)));
  });
}

/**
 * Text prompt
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const text = (args: TextPromptOptions) => toPrompt("TextPrompt", args);

/**
 * Password prompt with masked input
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const password = (args: TextPromptOptions) =>
  text({ ...args, style: "password" });

/**
 * Prompt where input is invisible, like sudo
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {function} [args.onState] On state change callback
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const invisible = (args: TextPromptOptions) =>
  text({ ...args, style: "invisible" });

/**
 * Number prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const number = (args: NumberPromptOptions) =>
  toPrompt("NumberPrompt", args);

/**
 * Date prompt
 * @param {string} args.message Prompt message to display
 * @param {number} args.initial Default number value
 * @param {function} [args.onState] On state change callback
 * @param {number} [args.max] Max value
 * @param {number} [args.min] Min value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {Boolean} [opts.float=false] Parse input as floats
 * @param {Number} [opts.round=2] Round floats to x decimals
 * @param {Number} [opts.increment=1] Number to increment by when using arrow-keys
 * @param {function} [args.validate] Function to validate user input
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const date = (args: DatePromptOptions) => toPrompt("DatePrompt", args);

/**
 * Classic yes/no prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const confirm = (args: ConfirmPromptOptions) =>
  toPrompt("ConfirmPrompt", args);

/**
 * Toggle/switch prompt
 * @param {string} args.message Prompt message to display
 * @param {boolean} [args.initial=false] Default value
 * @param {string} [args.active="on"] Text for `active` state
 * @param {string} [args.inactive="off"] Text for `inactive` state
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const toggle = (args: TogglePromptOptions) =>
  toPrompt("TogglePrompt", args);

/**
 * Interactive select prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value }, ...]`
 * @param {number} [args.initial] Index of default value
 * @param {String} [args.hint] Hint to display
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const select = (args: SelectPromptOptions) =>
  toPrompt("SelectPrompt", args);

/**
 * List prompt, split intput string by `seperator`
 * @param {string} args.message Prompt message to display
 * @param {string} [args.initial] Default string value
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {string} [args.separator] String separator
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input, in form of an `Array`
 */
export const list = (args: TextPromptOptions & { separator?: string }) => {
  const sep = args.separator ?? ",";
  return toPrompt("TextPrompt", args, {
    onSubmit: (str) => str.split(sep).map((str) => str.trim()),
  });
};

/**
 * Interactive multi-select / autocompleteMultiselect prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of choices objects `[{ title, value, [selected] }, ...]`
 * @param {number} [args.max] Max select
 * @param {string} [args.hint] Hint to display user
 * @param {Number} [args.cursor=0] Cursor start position
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const multiselect = (args: MultiselectPromptOptions) => {
  args.choices = [...(args.choices ?? [])];
  const toSelected = (items: any[]) =>
    items.filter((item) => item.selected).map((item) => item.value);
  return toPrompt("MultiselectPrompt", args, {
    onAbort: toSelected,
    onSubmit: toSelected,
  });
};

export const autocompleteMultiselect = (args: MultiselectPromptOptions) => {
  args.choices = [...(args.choices ?? [])];
  const toSelected = (items: any[]) =>
    items.filter((item) => item.selected).map((item) => item.value);
  return toPrompt("AutocompleteMultiselectPrompt", args, {
    onAbort: toSelected,
    onSubmit: toSelected,
  });
};

const byTitle = (input: string, choices: any[]) =>
  Promise.resolve(
    choices.filter((item) =>
      item.title.toLowerCase().startsWith(input.toLowerCase()),
    ),
  );
/**
 * Interactive auto-complete prompt
 * @param {string} args.message Prompt message to display
 * @param {Array} args.choices Array of auto-complete choices objects `[{ title, value }, ...]`
 * @param {Function} [args.suggest] Function to filter results based on user input. Defaults to sort by `title`
 * @param {number} [args.limit=10] Max number of results to show
 * @param {string} [args.style="default"] Render style ('default', 'password', 'invisible')
 * @param {String} [args.initial] Index of the default value
 * @param {boolean} [opts.clearFirst] The first ESCAPE keypress will clear the input
 * @param {String} [args.fallback] Fallback message - defaults to initial value
 * @param {function} [args.onState] On state change callback
 * @param {Stream} [args.stdin] The Readable stream to listen to
 * @param {Stream} [args.stdout] The Writable stream to write readline data to
 * @returns {Promise} Promise with user input
 */
export const autocomplete = (args: AutocompletePromptOptions) => {
  args.suggest = args.suggest || byTitle;
  args.choices = [...(args.choices ?? [])];
  return toPrompt("AutocompletePrompt", args);
};
