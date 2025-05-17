import { DatePart } from "./datepart";

export class Milliseconds extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setMilliseconds(this.date.getMilliseconds() + 1);
  }

  down() {
    this.date.setMilliseconds(this.date.getMilliseconds() - 1);
  }

  setTo(val: string) {
    const ms = parseInt(val.slice(-this.token.length));
    if (!isNaN(ms)) {
      this.date.setMilliseconds(ms);
    }
  }

  toString() {
    return String(this.date.getMilliseconds())
      .padStart(4, "0")
      .substring(0, this.token.length);
  }
}
