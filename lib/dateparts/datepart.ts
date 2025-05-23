import { LocaleData } from "../elements/date";

export type DatePartOptions = {
  token: string;
  date?: Date;
  parts?: (DatePart | string)[];
  locales: LocaleData;
};

export class DatePart {
  token: string;
  date: Date;
  parts: (DatePart | string)[];
  locales: LocaleData;

  constructor({ token, date, parts, locales }: DatePartOptions) {
    this.token = token;
    this.date = date || new Date();
    this.parts = parts || [this];
    this.locales = locales;
  }

  up() {}

  down() {}

  next() {
    const currentIndex = this.parts.indexOf(this);
    return this.parts
      .slice(currentIndex + 1)
      .find((part) => part instanceof DatePart);
  }

  setTo(val: string) {}

  prev() {
    const reversedParts = [...this.parts].reverse();
    const currentIndex = reversedParts.indexOf(this);

    return reversedParts
      .slice(currentIndex + 1)
      .find((part) => part instanceof DatePart);
  }

  toString() {
    return String(this.date);
  }
}
