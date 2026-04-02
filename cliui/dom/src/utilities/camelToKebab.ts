/** Converts a camelCase property name to kebab-case. */
export function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}
