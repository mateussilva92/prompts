"use strict";

const keyActionMap = {
  ctrl: {
    a: "first",
    c: "abort",
    d: "abort",
    e: "last",
    g: "reset",
  },
  selectMode: {
    j: "down",
    k: "up",
  },
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
    home: "home", // TODO: create home() handler in prompt types
    end: "end", // TODO: create end() handler in prompt types
    up: "up",
    down: "down",
    right: "right",
    left: "left",
  },
};

module.exports = (key, isSelect) => {
  if (key.meta && key.name !== "escape") return;

  if (key.ctrl && keyActionMap.ctrl[key.name]) {
    return keyActionMap.ctrl[key.name];
  }

  if (isSelect && keyActionMap.selectMode[key.name]) {
    return keyActionMap.selectMode[key.name];
  }

  if (keyActionMap.general[key.name]) {
    return keyActionMap.general[key.name];
  }

  return false;
};
