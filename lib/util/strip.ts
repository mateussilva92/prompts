const ANSI_PATTERN =
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|" +
  "[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|" +
  "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))";

const ANSI_REGEX = new RegExp(ANSI_PATTERN, "g");

/**
 * Remove ANSI escape codes from a string.
 * If input is not a string, returns it unchanged.
 *
 * @param str - The input value (usually a string)
 * @returns The cleaned string without ANSI codes, or original value if not a string
 */

export function strip<T>(str: T): T {
  return typeof str === "string" ? (str.replace(ANSI_REGEX, "") as T) : str;
}
