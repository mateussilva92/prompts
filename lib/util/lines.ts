import { strip } from "./strip";

/**
 * Calculate how many lines a message will occupy given a max width per line.
 *
 * @param msg - The input string, possibly with ANSI codes.
 * @param perLine - Maximum characters per line. If not provided, returns number of lines.
 * @returns Number of lines the message will occupy when wrapped.
 */
export function lines(msg: string, perLine?: number): number {
  const cleanMsg = strip(msg) ?? "";
  const lines = cleanMsg.split(/\r?\n/);

  if (!perLine) {
    return lines.length;
  }

  return lines.reduce((acc, line) => acc + Math.ceil(line.length / perLine), 0);
}
