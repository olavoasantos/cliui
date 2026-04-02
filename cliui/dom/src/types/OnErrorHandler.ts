/** Window.onerror-compatible callback type. */
export type OnErrorHandler =
  | ((message: string, filename?: string, lineno?: number, colno?: number, error?: unknown) => void)
  | null;
