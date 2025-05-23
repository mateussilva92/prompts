import { DatePart } from "./datepart";

export class Month extends DatePart {
  up() {
    this.date.setMonth(this.date.getMonth() + 1);
  }

  down() {
    this.date.setMonth(this.date.getMonth() - 1);
  }

  setTo(val: string) {
    const monthIndex = parseInt(val.slice(-2)) - 1;
    const safeMonthIndex = Math.max(0, monthIndex);
    this.date.setMonth(safeMonthIndex);
  }

  toString(): string {
    const month = this.date.getMonth();

    switch (this.token.length) {
      case 2:
        return String(month + 1).padStart(2, "0");
      case 3:
        return this.locales.monthsShort[month];
      case 4:
        return this.locales.months[month];
      default:
        return String(month + 1);
    }
  }
}
