import { DatePart } from "./datepart";

export class Year extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setFullYear(this.date.getFullYear() + 1);
  }

  down() {
    this.date.setFullYear(this.date.getFullYear() - 1);
  }

  setTo(val: string): void {
    const year = parseInt(val.slice(-4));
    if (!isNaN(year)) {
      this.date.setFullYear(year);
    }
  }

  toString(): string {
    const year = String(this.date.getFullYear()).padStart(4, "0");
    return this.token.length === 2 ? year.slice(-2) : year;
  }
}
