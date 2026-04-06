/** Default port for the CDP WebSocket server. */
export const DEFAULT_CDP_PORT = 9222;

/** Stable frame identifier shared between Page and Runtime domains. */
export const FRAME_ID = 'terminal-dom-frame';

/** WebSocket close code for normal closure. */
export const WS_CLOSE_NORMAL = 1000;

/** WebSocket close code for server going away (e.g. bridge shutdown). */
export const WS_CLOSE_GOING_AWAY = 1001;
