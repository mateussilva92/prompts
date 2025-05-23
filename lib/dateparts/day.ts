import { DatePart } from "./datepart";

const getOrdinalSuffix = (n: number): string => {
  const rem10 = n % 10;
  const rem100 = n % 100;

  if (rem100 >= 11 && rem100 <= 13) {
    return "th";
  }

  switch (rem10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

export class Day extends DatePart {
  up() {
    this.date.setDate(this.date.getDate() + 1);
  }

  down() {
    this.date.setDate(this.date.getDate() - 1);
  }

  setTo(val: string) {
    const day = parseInt(val.slice(-2));
    if (!isNaN(day)) {
      this.date.setDate(day);
    }
  }

  toString() {
    const date = this.date.getDate();
    const day = this.date.getDay();

    switch (this.token) {
      case "DD":
        return String(date).padStart(2, "0");
      case "Do":
        return `${date}${getOrdinalSuffix(date)}`;
      case "d":
        return String(day + 1);
      case "ddd":
        return this.locales.weekdaysShort[day];
      case "dddd":
        return this.locales.weekdays[day];
      default:
        return String(date);
    }
  }
}
