import { DatePart } from "./datepart";

export class Meridiem extends DatePart {
  up() {
    this.date.setHours((this.date.getHours() + 12) % 24);
  }

  down() {
    this.up();
  }

  toString(): string {
    const meridiem = this.date.getHours() >= 12 ? "pm" : "am";
    return this.token.startsWith("A") ? meridiem.toUpperCase() : meridiem;
  }
}
