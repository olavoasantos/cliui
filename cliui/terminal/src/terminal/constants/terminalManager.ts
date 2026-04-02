import {ESCAPE} from './escape';

/** Regex matching DECRPM responses for modes 2026 and 2027. */
export const SUPPORTED_MODE_RESPONSE = new RegExp(`${ESCAPE}\\[\\?(2026|2027);([0-4])\\$y`);
