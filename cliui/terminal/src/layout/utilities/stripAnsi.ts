import {ANSI_REGEX} from '../constants/cellWidth';

/** Removes ANSI escape sequences from a string. */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_REGEX, '');
}
