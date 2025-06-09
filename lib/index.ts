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

type Answers<N extends string, V extends unknown = unknown> = { [K in N]: V };

type Prompts = typeof prompts;

type PromptType = keyof Prompts;

type Falsy = false | null | undefined;

type PromptFunction<T extends PromptType, N extends string, R> = (
  prev: unknown,
  answers: Answers<N>,
  question: Question<T, N> | DynamicQuestion<T, N>,
) => Promise<R> | R;

type PromptOptionsFor<T extends PromptType> = Parameters<
  Prompts[T]
>[0];

type BaseQuestion<T extends PromptType, N extends string> = {
  type: T | PromptFunction<T, N, PromptType | Falsy>;
  name: N;
  [key: string]: any; // Additional properties can be added
}

type MaybeDynamic<T extends PromptType, N extends string, P> = P | PromptFunction<T, N, P>;

type DynamicQuestion<T extends PromptType, N extends string> = BaseQuestion<T, N> & {
  [K in keyof PromptOptionsFor<T> as K extends IgnoredKeys
    ? never
    : K]: MaybeDynamic<T, N, PromptOptionsFor<T>[K]>;
} & {
  [K in keyof PromptOptionsFor<T> as K extends IgnoredKeys
    ? K
    : never]: PromptOptionsFor<T>[K];
};

type Question<T extends PromptType, N extends string> = BaseQuestion<T, N> & PromptOptionsFor<T>;

type PromptOptions<T extends PromptType, N extends string> = {
  onSubmit?: (
    question: Question<T, N>,
    answer: any,
    answers: Answers<N>,
  ) => boolean | Promise<boolean>;
  onCancel?: (
    question: Question<T, N>,
    answers: Answers<N>,
  ) => boolean | Promise<boolean>;
};

/**
 * Prompt for a series of questions
 * @param {Array|Object} questions Single question object or Array of question objects
 * @param {Function} [onSubmit] Callback function called on prompt submit
 * @param {Function} [onCancel] Callback function called on cancel/abort
 * @returns {Object} Object with values from user input
 */
async function prompt<N extends string = string>(
  questions: DynamicQuestion<PromptType, N> | DynamicQuestion<PromptType, N>[],
  { onSubmit, onCancel }: PromptOptions<PromptType, N> = {},
): Promise<Answers<N>> {
  const answers = {} as Answers<N>;

  questions = Array.isArray(questions) ? questions : [questions];

  let answer: unknown;
  let quit: boolean = false;
  let question: Question<PromptType, N> | undefined;

  for (let dynamicQuestion of questions) {
    let { name, type } = dynamicQuestion;

    // evaluate type first and skip if type is a falsy value
    if (typeof type === "function") {
      const evaluatedType = await type(answer, { ...answers }, dynamicQuestion);

      if (!evaluatedType) {
        continue;
      }

      type = evaluatedType as PromptType;
      dynamicQuestion.type = type; // TODO: check this is really required
    }

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
    question = dynamicQuestion as Question<typeof type, N>;

    // TODO: Check if this is realy required since we force it with TS.
    //       how would this work on a JS project
    if (typeof question.message !== "string") {
      throw new Error("prompt message is required");
    }

    const currentPrompt = prompts[type];
    if (!currentPrompt) {
      throw new Error(`prompt type (${type}) is not defined`);
    }

    if (prompt._override[name] !== undefined) {
      answer = await getFormattedAnswer(answers, question, prompt._override[name]);
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

async function getFormattedAnswer<N extends string>(
  answers: Answers<N>,
  question: Question<PromptType, N>,
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

namespace prompt {
  export let _injected: any[] = [];
  export let _override: Record<string, any> = {};

  export function inject(answers: any[]) {
    _injected = [..._injected, ...answers];
  }

  export function override<N extends string>(answers: Answers<N>) {
    _override = { ...answers };
  }
}

export { prompt };
