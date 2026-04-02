import type {EditableConfiguration} from './EditableConfiguration';

/**
 * Options for {@link handleCaretKeyDown}.
 */
export interface CaretKeyDownOptions {
  /**
   * Callback invoked when the user triggers a clipboard copy or cut.
   * Receives the selected text.  When omitted, copy/cut keybindings are
   * silently ignored.
   */
  onClipboardWrite?: (text: string) => void;

  /**
   * Callback invoked when the user triggers a clipboard paste (Ctrl+V /
   * Meta+V).  Returns the current clipboard text.  When omitted, the
   * paste keybinding is ignored (bracketed paste from the terminal
   * emulator still works independently).
   */
  onClipboardRead?: () => string;

  /**
   * Declarative editable configuration for 2D navigation support.
   * When provided, enables ArrowUp/Down navigation and per-line
   * Home/End behavior.
   */
  config?: EditableConfiguration;

  /**
   * Resolved viewport width in terminal cells from the element's layout.
   * Takes precedence over `config.intrinsicWidth()` when provided.
   */
  viewportWidth?: number;

  /**
   * Resolved viewport height in rows from the element's layout.
   * Takes precedence over `config.intrinsicHeight()` when provided.
   */
  viewportHeight?: number;
}
