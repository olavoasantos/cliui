/** Init options for {@link TransitionEvent}. */
export interface TransitionEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  propertyName?: string;
  elapsedTime?: number;
  pseudoElement?: string;
}
