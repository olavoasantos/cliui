import type {Element} from '@cliui/dom';
import type {KeyframeBlock} from './KeyframeRule';

/** Describes an active CSS animation on an element. */
export interface ActiveAnimation {
  element: Element;
  name: string;
  keyframes: KeyframeBlock[];
  startTime: number;
  duration: number;
  delay: number;
  easing: string;
  iterationCount: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  playState: 'running' | 'paused';
  /** Accumulated elapsed time before the most recent pause. */
  pausedElapsed: number;
  /** Timestamp when the animation was last paused, or 0 if running. */
  pausedAt: number;
  /** Current completed iteration count. */
  currentIteration: number;
}
