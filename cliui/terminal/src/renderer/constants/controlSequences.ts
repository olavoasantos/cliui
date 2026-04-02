const ESC = '\u001B';

export const CSI = `${ESC}[`;
export const OSC = `${ESC}]`;
export const BEL = '\u0007';
export const ENABLE_SYNCHRONIZED_OUTPUT = `${CSI}?2026h`;
export const DISABLE_SYNCHRONIZED_OUTPUT = `${CSI}?2026l`;
