import EventEmitter from "events";
import kleur, { Kleur } from "kleur";
import readline, { Key } from "readline";
import { beep, cursor } from "sisteransi";
import { ReadStream, WriteStream } from "tty";
import { action } from "../util";

type PromptOptions = {
	stdin?: ReadStream;
	stdout?: WriteStream;
	onRender?: (kleur: Kleur) => void;
};

/**
 * Base prompt skeleton
 */
class Prompt<T = unknown> extends EventEmitter {
	private stdin: ReadStream;
	protected stdout: WriteStream;
	protected onRender: (kleur: Kleur) => void;

	protected firstRender = true;
	protected closed = false;
	protected value?: T;
	protected aborted = false;
	protected exited = false;

	private isSelectPrompt: boolean = false;
	private rl: readline.Interface;

	constructor(options: PromptOptions = {}) {
		super();

		this.stdin = options.stdin ?? process.stdin;
		this.stdout = options.stdout ?? process.stdout;
		this.onRender = (options.onRender ?? (() => {})).bind(this);

		this.rl = readline.createInterface({
			input: this.stdin,
			escapeCodeTimeout: 50,
		});
		readline.emitKeypressEvents(this.stdin, this.rl);

		if (this.stdin.isTTY) {
			this.stdin.setRawMode(true);
		}

		const isSelectPrompt = ["SelectPrompt", "MultiselectPrompt"].includes(
			this.constructor.name
		);

		this.stdin.on("keypress", this.handleKeypress);
	}

	/** Handle keypress events */
	private handleKeypress = (str: string, key: Key): void => {
		const act = action(key, this.isSelectPrompt);

		if (act === false) {
			this.keyHandler?.(str, key);
		} else if (typeof (this as any)[act] === "function") {
			(this as any)[act](key);
		} else {
			this.bell();
		}
	};

	/** Closes the prompt, finalizing user input */
	protected close(): void {
		this.stdout.write(cursor.show);
		this.stdin.removeListener("keypress", this.handleKeypress);

		if (this.stdin.isTTY) {
			this.stdin.setRawMode(false);
		}

		this.rl.close();

		const event = this.aborted ? "abort" : this.exited ? "exit" : "submit";

		this.emit(event, this.value);
		this.closed = true;
	}

	protected keyHandler(char: string, key: Key): void {
		throw new Error("Method 'keyHandler' not implemented.");
	}

	/** Trigger a state update */
	protected fire(): void {
		this.emit("state", {
			value: this.value,
			aborted: !!this.aborted,
			exited: !!this.exited,
		});
	}

	/** Play terminal bell sound */
	protected bell(): void {
		this.stdout.write(beep);
	}

	/** Render the prompt to screen */
	protected render(): void {
		this.onRender(kleur);
		if (this.firstRender) this.firstRender = false;
	}
}

module.exports = Prompt;
