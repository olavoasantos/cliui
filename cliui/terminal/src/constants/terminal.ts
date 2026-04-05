export const DEFAULT_COLUMNS = 80;
export const DEFAULT_ROWS = 24;
export const DEFAULT_FPS = 60;

/**
 * Maximum FPS when the terminal does not support synchronized output (mode 2026).
 *
 * Without atomic frame rendering, rapid ANSI updates cause visible tearing
 * because the terminal renders escape sequences as they arrive. Capping at
 * a lower FPS gives each frame enough time to fully render before the next
 * one starts.
 */
export const MAX_FPS_WITHOUT_SYNC_OUTPUT = 15;
