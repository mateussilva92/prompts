/**
 * @param {string} message The message to wrap
 * @param {object} options
 * @param {number|string} [options.margin] Left margin
 * @param {number} options.width Maximum characters per line including the margin
 */
export function wrap(
  message: string,
  options: { margin?: number | string; width: number }
): string {
  const { width, margin } = options;

  let tab = "";
  if (typeof margin === "number" && Number.isSafeInteger(margin)) {
    tab = " ".repeat(margin);
  } else if (typeof margin === "string") {
    tab = margin;
  }

  return (message || "")
    .split(/\r?\n/g)
    .map((line) =>
      line
        .split(/\s+/g)
        .reduce(
          (arr, w) => {
            if (
              w.length + tab.length >= width ||
              arr[arr.length - 1].length + w.length + 1 < width
            )
              arr[arr.length - 1] += ` ${w}`;
            else arr.push(`${tab}${w}`);
            return arr;
          },
          [tab]
        )
        .join("\n")
    )
    .join("\n");
}
