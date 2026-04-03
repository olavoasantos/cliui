/**
 * Describes an image that needs to be rendered at a specific cell
 * region during the current frame.
 */
export interface ImageRenderRequest {
  /** Raw image file bytes (PNG, JPEG, or GIF). */
  data: Uint8Array;

  /** Original image pixel width as read from the file header. */
  naturalWidth: number;

  /** Original image pixel height as read from the file header. */
  naturalHeight: number;

  /** Terminal column where the image region starts. */
  x: number;

  /** Terminal row where the image region starts. */
  y: number;

  /** Width of the image region in terminal cells. */
  cellWidth: number;

  /** Height of the image region in terminal cells. */
  cellHeight: number;

  /** Fallback text to display when no graphics protocol is available. */
  alt: string;
}
