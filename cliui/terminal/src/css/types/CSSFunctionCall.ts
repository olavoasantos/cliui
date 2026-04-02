/**
 * Result of parsing a CSS function call from a value string.
 */
export interface CSSFunctionCall {
  /** Function name (e.g. `"var"`, `"linear-gradient"`). */
  name: string;
  /** Raw argument string inside the parentheses. */
  args: string;
  /** Start index of the function call in the original string. */
  start: number;
  /** End index (exclusive) of the function call in the original string. */
  end: number;
}
