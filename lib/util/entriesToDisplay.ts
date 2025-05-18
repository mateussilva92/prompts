/**
 * Determine what entries should be displayed on the screen, based on the
 * currently selected index and the maximum visible. Used in list-based
 * prompts like `select` and `multiselect`.
 *
 * @param cursor - The currently selected entry
 * @param total - The total entries available to display
 * @param maxVisible - The number of entries that can be displayed (default is total)
 * @returns An object with `startIndex` and `endIndex` properties
 */
export function entriesToDisplay(
  cursor: number,
  total: number,
  maxVisible: number = total
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(
    0,
    Math.min(total - maxVisible, cursor - Math.floor(maxVisible / 2))
  );
  const endIndex = Math.min(startIndex + maxVisible, total);

  return { startIndex, endIndex };
}
