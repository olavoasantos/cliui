/**
 * Declarative configuration for an editable text surface.
 *
 * Components set `[EDITABLE]` to this interface and the terminal
 * editing system manages all state, event handling, cursor rendering,
 * scrolling, and content synchronization automatically.
 *
 * The `intrinsicWidth` and `intrinsicHeight` values are sizing hints
 * used by the layout engine when no CSS width/height is set. The
 * actual editing viewport dimensions come from the element's computed
 * layout content area at runtime.
 */
export interface EditableConfiguration {
  /**
   * Returns the intrinsic width of the editing surface in terminal cells.
   * Used as the default element width when no CSS width is specified.
   */
  intrinsicWidth(): number;

  /**
   * Returns the intrinsic height of the editing surface in rows.
   * Used as the default element height when no CSS height is specified.
   */
  intrinsicHeight(): number;

  /** Whether to wrap text at the viewport width boundary. */
  wordWrap: boolean;

  /** Whether Enter inserts newlines and ArrowUp/Down navigate lines. */
  multiLine: boolean;

  /**
   * Attribute name to sync the grapheme value to.
   * When set, the system keeps this attribute in sync with the content.
   */
  valueAttribute?: string;

  /**
   * Returns the maximum grapheme count, or 0 for unlimited.
   * Called on each edit to allow dynamic limits.
   */
  maxLength?(): number;

  /**
   * Returns the placeholder text to display when the field is empty
   * and unfocused.
   */
  placeholder?(): string;
}
