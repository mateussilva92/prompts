import * as prompts from "./prompts";

export * as prompts from "./prompts";

const ignorableProps = [
  "suggest",
  "format",
  "onState",
  "validate",
  "onRender",
  "type",
] as const;

type IgnoredKeys = (typeof ignorableProps)[number];

type Answers = Record<string, unknown>;

type PromptType = keyof typeof prompts;

type PromptFunction<T extends PromptType, R> = (
  prev: unknown,
  answers: Answers,
  question: Question<T> | DynamicQuestion<T>,
) => Promise<R> | R;

type PromptOptionsFor<T extends PromptType> = Parameters<
  (typeof prompts)[T]
>[0];

type MaybeDynamic<T extends PromptType, P> = P | PromptFunction<T, P>;

type DynamicQuestion<T extends PromptType> = {
  type: T | PromptFunction<T, PromptType>;
  name: string;
  [key: string]: any; // Additional properties can be added
} & {
  [K in keyof PromptOptionsFor<T> as K extends IgnoredKeys
    ? never
    : K]: MaybeDynamic<T, PromptOptionsFor<T>[K]>;
} & {
  [K in keyof PromptOptionsFor<T> as K extends IgnoredKeys
    ? K
    : never]: PromptOptionsFor<T>[K];
};

type Question<T extends PromptType> = {
  type: T | PromptFunction<T, PromptType>;
  name: string;
  [key: string]: any; // Additional properties can be added
} & PromptOptionsFor<T>;

type PromptOptions<T extends PromptType> = {
  onSubmit?: (
    question: Question<T>,
    answer: any,
    answers: Answers,
  ) => boolean | Promise<boolean>;
  onCancel?: (
    question: Question<T>,
    answers: Answers,
  ) => boolean | Promise<boolean>;
};

/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */
export const prompt: {
  (
    questions?: DynamicQuestion<PromptType>[] | DynamicQuestion<PromptType>, // TODO: Does it even make sense to have no questions here?
    options?: PromptOptions<PromptType>,
  ): Promise<Answers>;
  _injected?: any[];
  _override?: Record<string, any>;
} = async function (
  questions: DynamicQuestion<PromptType>[] | DynamicQuestion<PromptType> = [],
  { onSubmit, onCancel }: PromptOptions<PromptType> = {},
): Promise<Answers> {
  const answers: Answers = {};
  const override = prompt._override || {};
  questions = Array.isArray(questions) ? questions : [questions];

  let answer: unknown;
  let quit: boolean = false;
  let question: Question<PromptType> | undefined;

  for (let dynamicQuestion of questions) {
    let { name, type } = dynamicQuestion;

    // evaluate type first and skip if type is a falsy value
    if (typeof type === "function") {
      type = await type(answer, { ...answers }, dynamicQuestion);
      dynamicQuestion.type = type;
    }
    if (!type) continue;

    // if property is a function, invoke it unless it's a special function
    for (const key of Object.keys(dynamicQuestion)) {
      const value = dynamicQuestion[key];

      if (
        typeof value === "function" &&
        !(ignorableProps as readonly string[]).includes(key)
      ) {
        dynamicQuestion[key] = await value(answer, { ...answers }, question);
      }
    }

    // Cast dynamic question to normal question
    question = dynamicQuestion as Question<typeof type>;

    // TODO: Check if this is realy required since we force it with TS.
    //       how would this work on a JS project
    if (typeof question.message !== "string") {
      throw new Error("prompt message is required");
    }

    const currentPrompt = prompts[type];
    if (!currentPrompt) {
      throw new Error(`prompt type (${type}) is not defined`);
    }

    if (override[name] !== undefined) {
      answer = await getFormattedAnswer(answers, question, override[name]);
      if (answer !== undefined) {
        answers[name] = answer;
        continue;
      }
    }

    try {
      // Get the injected answer if there is one, or prompt the user
      answer = prompt._injected
        ? getInjectedAnswer(prompt._injected, question.initial)
        : await currentPrompt(question as never); // Cast to never to avoid type issues
      answers[name] = answer = await getFormattedAnswer(
        answers,
        question,
        answer,
        true,
      );
      quit = (await onSubmit?.(question, answer, answers)) ?? false;
    } catch (err) {
      quit = !(await onCancel?.(question, answers)); // TODO: Since we don't have a default function this might fail
    }

    if (quit) return answers;
  }

  return answers;
};

async function getFormattedAnswer(
  answers: Answers,
  question: Question<PromptType>,
  answer: any,
  skipValidation = false,
): Promise<any> {
  if (
    !skipValidation &&
    question?.validate &&
    question.validate(answer) !== true
  ) {
    return;
  }
  return question.format ? await question.format(answer, answers) : answer;
}

function getInjectedAnswer(injected: any[], defaultValue: any) {
  const answer = injected.shift();
  if (answer instanceof Error) throw answer;
  return answer === undefined ? defaultValue : answer;
}

export function inject(answers: any[]) {
  prompt._injected = [...(prompt._injected ?? []), ...answers];
}

export function override(answers: Record<string, any>) {
  prompt._override = { ...answers };
}
