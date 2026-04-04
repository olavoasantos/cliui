import type {Element} from '@cliui/dom';

/** Describes an active CSS transition on a single property. */
export interface ActiveTransition {
  element: Element;
  property: string;
  startValue: string;
  endValue: string;
  startTime: number;
  duration: number;
  delay: number;
  easing: string;
}
