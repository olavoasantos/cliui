/**
 * Current media values for evaluating `@media` conditions.
 *
 * Holds the viewport dimensions and user preference values that media
 * features are evaluated against. Values use cell units (integers)
 * for dimensions.
 */
export interface MediaValues {
  /** Terminal width in columns (cells). */
  width: number;
  /** Terminal height in rows (cells). */
  height: number;
  /** User's color scheme preference. */
  'prefers-color-scheme': 'dark' | 'light';
  /** User's reduced motion preference. */
  'prefers-reduced-motion': 'reduce' | 'no-preference';
  /** Viewport orientation: `landscape` when width > height, `portrait` otherwise. */
  orientation: 'landscape' | 'portrait';
}
