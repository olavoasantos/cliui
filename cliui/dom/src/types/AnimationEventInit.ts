/** Init options for {@link AnimationEvent}. */
export interface AnimationEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  animationName?: string;
  elapsedTime?: number;
  pseudoElement?: string;
}
