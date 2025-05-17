import { DatePart } from "./datepart";

export class Hours extends DatePart {
  constructor(opts = {}) {
    super(opts);
  }

  up() {
    this.date.setHours(this.date.getHours() + 1);
  }

  down() {
    this.date.setHours(this.date.getHours() - 1);
  }

  setTo(val: string) {
    const hours = parseInt(val.slice(-2), 10);
    if (!isNaN(hours)) {
      this.date.setHours(hours);
    }
  }

  toString() {
    let hours = this.date.getHours();

    if (this.token.includes("h")) {
      hours = hours % 12 || 12; // Convert to 12-hour format
    }

    const padded = this.token.length > 1;
    return padded ? String(hours).padStart(2, "0") : String(hours);
  }
}
