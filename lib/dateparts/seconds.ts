import { DatePart } from "./datepart";

export class Seconds extends DatePart {
  up() {
    this.date.setSeconds(this.date.getSeconds() + 1);
  }

  down() {
    this.date.setSeconds(this.date.getSeconds() - 1);
  }

  setTo(val: string) {
    const seconds = parseInt(val.slice(-2));
    if (!isNaN(seconds)) {
      this.date.setSeconds(seconds);
    }
  }

  toString(): string {
    const seconds = this.date.getSeconds();
    return this.token.length > 1
      ? String(seconds).padStart(2, "0")
      : String(seconds);
  }
}
