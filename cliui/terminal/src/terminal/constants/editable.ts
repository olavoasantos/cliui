/**
 * Symbol property key for the declarative editable configuration.
 *
 * Components set `this[EDITABLE]` to an {@link EditableConfiguration}
 * object. The terminal editing system detects this symbol on focus
 * and manages all editing behavior automatically.
 */
export const EDITABLE: unique symbol = Symbol('editable');
