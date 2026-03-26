const ESC = '\u001B';

export const ENABLE_ALT_SCREEN = `${ESC}[?1049h`;
export const DISABLE_ALT_SCREEN = `${ESC}[?1049l`;
export const HIDE_CURSOR = `${ESC}[?25l`;
export const SHOW_CURSOR = `${ESC}[?25h`;
export const ENABLE_MOUSE_BUTTON_EVENTS = `${ESC}[?1002h`;
export const DISABLE_MOUSE_BUTTON_EVENTS = `${ESC}[?1002l`;
export const ENABLE_MOUSE_SGR = `${ESC}[?1006h`;
export const DISABLE_MOUSE_SGR = `${ESC}[?1006l`;
export const ENABLE_FOCUS_EVENTS = `${ESC}[?1004h`;
export const DISABLE_FOCUS_EVENTS = `${ESC}[?1004l`;
export const ENABLE_BRACKETED_PASTE = `${ESC}[?2004h`;
export const DISABLE_BRACKETED_PASTE = `${ESC}[?2004l`;
export const BRACKETED_PASTE_START = `${ESC}[200~`;
export const BRACKETED_PASTE_END = `${ESC}[201~`;
