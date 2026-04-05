/**
 * Resolved dimensions of a container element for evaluating `@container` conditions.
 *
 * Unlike {@link MediaValues}, container values only include dimensional
 * features — preference features (`prefers-color-scheme`, `prefers-reduced-motion`)
 * are not valid in container queries.
 */
export interface ContainerValues {
  /** Container's resolved content width in cells. */
  width: number;
  /** Container's resolved content height in cells. */
  height: number;
}
