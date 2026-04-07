const ESC = '\u001B';

export const ENABLE_ALT_SCREEN = `${ESC}[?1049h`;
export const DISABLE_ALT_SCREEN = `${ESC}[?1049l`;
export const HIDE_CURSOR = `${ESC}[?25l`;
export const SHOW_CURSOR = `${ESC}[?25h`;
export const ENABLE_MOUSE_ANY_EVENTS = `${ESC}[?1003h`;
export const DISABLE_MOUSE_ANY_EVENTS = `${ESC}[?1003l`;
export const ENABLE_MOUSE_SGR = `${ESC}[?1006h`;
export const DISABLE_MOUSE_SGR = `${ESC}[?1006l`;
export const ENABLE_FOCUS_EVENTS = `${ESC}[?1004h`;
export const DISABLE_FOCUS_EVENTS = `${ESC}[?1004l`;
export const ENABLE_BRACKETED_PASTE = `${ESC}[?2004h`;
export const DISABLE_BRACKETED_PASTE = `${ESC}[?2004l`;
export const BRACKETED_PASTE_START = `${ESC}[200~`;
export const BRACKETED_PASTE_END = `${ESC}[201~`;

/** OSC 2 — set window/tab title. Terminated by BEL. */
export const OSC_SET_TITLE_PREFIX = `${ESC}]2;`;

/** OSC 22 — push title to stack. */
export const OSC_PUSH_TITLE = `${ESC}[22;2t`;

/** OSC 23 — pop title from stack. */
export const OSC_POP_TITLE = `${ESC}[23;2t`;

/** OSC 7 — report current working directory. */
export const OSC_CWD_PREFIX = `${ESC}]7;`;

/** OSC 9 — iTerm2 / Konsole notification. */
export const OSC_NOTIFY_9_PREFIX = `${ESC}]9;`;

/** OSC 777 — rxvt-unicode notification. */
export const OSC_NOTIFY_777_PREFIX = `${ESC}]777;notify;`;

/** BEL character — universal terminal alert / OSC terminator. */
export const BEL = '\x07';
