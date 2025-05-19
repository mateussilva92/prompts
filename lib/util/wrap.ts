type WrapOptions = {
	margin?: number | string;
	width: number;
};

/**
 * Wraps a message to a given width, applying a left margin.
 * @param message The message to wrap
 * @param options Options for wrapping
 * @returns A formatted string with word wrapping and margin
 */
export function wrap(message: string, options: WrapOptions): string {
	const { margin, width } = options;

	const marginStr = String(margin || "");
	const marginNum = parseInt(marginStr);

	const tab = Number.isSafeInteger(marginNum)
		? " ".repeat(marginNum)
		: marginStr;

	return (message || "")
		.split(/\r?\n/g)
		.map((line) => {
			const words = line.split(/\s+/g);
			const lines: string[] = [tab];

			for (const word of words) {
				const currentLine = lines[lines.length - 1];
				const proposedLine =
					currentLine + (currentLine.trim() ? " " : "") + word;

				if (proposedLine.length > width) {
					lines.push(tab + word);
				} else {
					lines[lines.length - 1] = proposedLine;
				}
			}

			return lines.join("\n");
		})
		.join("\n");
}
