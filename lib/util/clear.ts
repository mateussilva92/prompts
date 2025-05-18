import { cursor, erase } from "sisteransi";
import { strip } from "./strip";

/**
 * Calculate how many terminal lines the prompt occupies based on `perLine` width.
 *
 * @param prompt - The prompt string (may contain multiple lines)
 * @param perLine - Optional number of columns per line (e.g., terminal width). Used to calculate wrapping.
 * @returns ANSI escape sequence to erase the necessary number of lines and reset cursor
 */
export function clear(prompt: string, perLine?: number): string {
  if (!perLine) return erase.line + cursor.to(0);

  const lines = prompt.split(/\r?\n/);
  let rows = 0;

  for (const line of lines) {
    // Calculate how many terminal rows the line will occupy (including wrapping)
    const width = strip(line).length;
    rows += 1 + Math.floor(Math.max(width - 1, 0) / perLine);
  }

  return erase.lines(rows);
}
