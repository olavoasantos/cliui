/** Returns whether a property name is a CSS custom property (`--*`). */
export function isCustomProperty(name: string): boolean {
  return name.length > 2 && name[0] === '-' && name[1] === '-';
}
