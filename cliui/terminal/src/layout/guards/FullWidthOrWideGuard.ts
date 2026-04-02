import {FullWidthGuard} from './FullWidthGuard';
import {WideGuard} from './WideGuard';

/** Returns whether a code point is fullwidth or wide. */
export function FullWidthOrWideGuard(codePoint: number): boolean {
  return FullWidthGuard(codePoint) || WideGuard(codePoint);
}
