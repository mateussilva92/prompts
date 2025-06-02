import EventEmitter from "events";
import kleur, { Kleur } from "kleur";
import readline, { Key } from "readline";
import { beep, cursor } from "sisteransi";
import { ReadStream, WriteStream } from "tty";
import { action } from "../util";

export type PromptOptions = {
  stdin?: ReadStream;
  stdout?: WriteStream;
  onRender?: (kleur: Kleur) => void;

  message: string;
};

/**
 * Base prompt skeleton
 */
export class Prompt<T = unknown> extends EventEmitter {
  private stdin: ReadStream;
  protected stdout: WriteStream;
  protected onRender: (kleur: Kleur) => void;
  
  protected _value!: T; // Value should be set by subclasses
  
  protected firstRender = true;
  // TODO: Add doc for each prop bellow
  protected closed = false;
  protected done = false;
  protected exited = false;
  protected aborted = false;
  
  protected message: string;
  protected outputText = "";

  private isSelectPrompt: boolean = false;
  private rl: readline.Interface;

  constructor(options: PromptOptions) {
    super();

    this.stdin = options.stdin ?? process.stdin;
    this.stdout = options.stdout ?? process.stdout;
    this.onRender = (options.onRender ?? (() => {})).bind(this);

    this.message = options.message;

    this.rl = readline.createInterface({
      input: this.stdin,
      escapeCodeTimeout: 50,
    });
    readline.emitKeypressEvents(this.stdin, this.rl);

    if (this.stdin.isTTY) {
      this.stdin.setRawMode(true);
    }

    this.isSelectPrompt = ["SelectPrompt", "MultiselectPrompt"].includes(
      this.constructor.name,
    );

    this.stdin.on("keypress", this.handleKeypress);
  }

  protected get value(): T {
    return this._value;
  }

  protected set value(val: T) {
    this._value = val;
    this.fire();
  }

  /** Handle keypress events */
  private handleKeypress = (char: string, key: Key): void => {
    const act = action(key, this.isSelectPrompt);

    if (act === false) {
      this.keyHandler?.(char, key);
    } else if (typeof (this as any)[act] === "function") {
      (this as any)[act](key);
    } else {
      this.bell();
    }
  };

  /** Closes the prompt, finalizing user input */
  protected close(): void {
    this.stdout.write("\n" + cursor.show);
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
    this.render();
  }

  /** Trigger a state update */
  protected fire(): void {
    this.emit("state", {
      value: this.value,
      aborted: this.aborted,
      exited: this.exited,
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
