type Figures = {
  arrowUp: string;
  arrowDown: string;
  arrowLeft: string;
  arrowRight: string;
  radioOn: string;
  radioOff: string;
  tick: string;
  cross: string;
  ellipsis: string;
  pointerSmall: string;
  line: string;
  pointer: string;
};

const main: Figures = {
  arrowUp: "↑",
  arrowDown: "↓",
  arrowLeft: "←",
  arrowRight: "→",
  radioOn: "◉",
  radioOff: "◯",
  tick: "✔",
  cross: "✖",
  ellipsis: "…",
  pointerSmall: "›",
  line: "─",
  pointer: "❯",
};

const win: Figures = {
  arrowUp: main.arrowUp,
  arrowDown: main.arrowDown,
  arrowLeft: main.arrowLeft,
  arrowRight: main.arrowRight,
  radioOn: "(*)",
  radioOff: "( )",
  tick: "√",
  cross: "×",
  ellipsis: "...",
  pointerSmall: "»",
  line: "─",
  pointer: ">",
};

export const figures = process.platform === "win32" ? win : main;
