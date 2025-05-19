import kleur from "kleur";
import { figures } from "./figures";

// Define input render styles
type StyleType = "password" | "emoji" | "invisible" | "default";

type Style = {
	scale: number;
	render: (input: string) => string;
};

const styles: Record<StyleType, Style> = Object.freeze({
	password: {
		scale: 1,
		render: (input) => "*".repeat(input.length),
	},
	emoji: {
		scale: 2,
		render: (input) => "😃".repeat(input.length),
	},
	invisible: {
		scale: 0,
		render: () => "",
	},
	default: {
		scale: 1,
		render: (input) => input,
	},
});

// Resolve style by type, with a fallback
export function render(type: StyleType | string): Style {
	return (styles as Record<string, Style>)[type] || styles.default;
}

// icon to signalize a prompt.
const symbols = Object.freeze({
	aborted: kleur.red(figures.cross),
	done: kleur.green(figures.tick),
	exited: kleur.yellow(figures.cross),
	default: kleur.cyan("?"),
});

// Choose symbol based on prompt state
// TODO: move this to a enum or a string literal union type.
export function symbol(
	done: boolean,
	aborted: boolean,
	exited: boolean
): string {
	if (aborted) return symbols.aborted;
	if (exited) return symbols.exited;
	if (done) return symbols.done;
	return symbols.default;
}

// Character between question and user input
export function delimiter(completing: boolean): string {
	return kleur.gray(completing ? figures.ellipsis : figures.pointerSmall);
}
