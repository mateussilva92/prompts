import { DatePart } from "./datepart";

export class Minutes extends DatePart {
  up() {
    this.date.setMinutes(this.date.getMinutes() + 1);
  }

  down() {
    this.date.setMinutes(this.date.getMinutes() - 1);
  }

  setTo(val: string) {
    const minutes = parseInt(val.slice(-2));
    if (!isNaN(minutes)) {
      this.date.setMinutes(minutes);
    }
  }

  toString(): string {
    const minutes = this.date.getMinutes();
    return this.token.length > 1
      ? String(minutes).padStart(2, "0")
      : String(minutes);
  }
}
