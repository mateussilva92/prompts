import { Key } from "readline";

type Action =
	| "first"
	| "abort"
	| "last"
	| "reset"
	| "down"
	| "up"
	| "submit"
	| "delete"
	| "deleteForward"
	| "exit"
	| "next"
	| "nextPage"
	| "prevPage"
	| "home"
	| "end"
	| "right"
	| "left"
	| false;

const keyActionMap = {
	ctrl: {
		a: "first",
		c: "abort",
		d: "abort",
		e: "last",
		g: "reset",
	} as Record<string, Action>,
	selectMode: {
		j: "down",
		k: "up",
	} as Record<string, Action>,
	general: {
		return: "submit",
		enter: "submit",
		backspace: "delete",
		delete: "deleteForward",
		abort: "abort",
		escape: "exit",
		tab: "next",
		pagedown: "nextPage",
		pageup: "prevPage",
		home: "home",
		end: "end",
		up: "up",
		down: "down",
		right: "right",
		left: "left",
	} as Record<string, Action>,
};

export function action(
	{ name = "", ctrl, meta }: Key,
	isSelect: boolean
): Action {
	if (meta && name !== "escape") return false;

	if (ctrl && keyActionMap.ctrl[name]) {
		return keyActionMap.ctrl[name];
	}

	if (isSelect && keyActionMap.selectMode[name]) {
		return keyActionMap.selectMode[name];
	}

	if (keyActionMap.general[name]) {
		return keyActionMap.general[name];
	}

	return false;
}
