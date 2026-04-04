import {evaluateEasing} from '../utilities/evaluateEasing';
import {interpolateValue} from '../utilities/interpolateValue';
import {parseEasingValue} from '../utilities/parseEasingValue';
import {parseTimeValue} from '../utilities/parseTimeValue';
import {ANIMATABLE_PROPERTIES} from '../constants/animatableProperties';

import type {Element} from '@cliui/dom';
import type {ComputedStyle} from '../types';
import type {ActiveTransition} from '../types/ActiveTransition';

/**
 * Manages active CSS transitions per element.
 *
 * Detects computed style value changes for properties with `transition` defined,
 * starts transitions from old → new, computes interpolated values each frame,
 * and handles cancellation when a new change occurs mid-transition.
 */
export class TransitionController {
  #active: ActiveTransition[] = [];

  /** Returns true when there are active transitions. */
  get hasActive(): boolean {
    return this.#active.length > 0;
  }

  /** Returns all elements that currently have active transitions. */
  getActiveElements(): Set<Element> {
    const elements = new Set<Element>();
    for (const t of this.#active) {
      elements.add(t.element);
    }
    return elements;
  }

  /**
   * Detects value changes and starts transitions where appropriate.
   *
   * Called by the style engine after computing a new cascaded value.
   *
   * @param element - The element whose style changed.
   * @param oldStyle - Previous computed style.
   * @param newStyle - Newly computed style.
   * @param timestamp - Current frame timestamp.
   */
  detectChanges(
    element: Element,
    oldStyle: ComputedStyle,
    newStyle: ComputedStyle,
    timestamp: number,
  ): void {
    const transitionProperty = newStyle.get('transition-property');
    if (!transitionProperty || transitionProperty === 'none') return;

    const properties = transitionProperty.split(',').map((s) => s.trim());
    const durations = (newStyle.get('transition-duration') ?? '0ms')
      .split(',')
      .map((s) => s.trim());
    const easings = (newStyle.get('transition-timing-function') ?? 'ease')
      .split(',')
      .map((s) => s.trim());
    const delays = (newStyle.get('transition-delay') ?? '0ms').split(',').map((s) => s.trim());

    const isAll = properties.length === 1 && properties[0] === 'all';
    const propsToCheck = isAll
      ? this.#getChangedAnimatableProperties(oldStyle, newStyle)
      : properties;

    for (let i = 0; i < propsToCheck.length; i++) {
      const prop = propsToCheck[i]!;
      const oldVal = oldStyle.get(prop);
      const newVal = newStyle.get(prop);

      if (oldVal === undefined || newVal === undefined || oldVal === newVal) continue;

      const duration = parseTimeValue(durations[isAll ? 0 : i % durations.length] ?? '0ms');
      if (duration <= 0) continue;

      const easing = easings[isAll ? 0 : i % easings.length] ?? 'ease';
      const delay = parseTimeValue(delays[isAll ? 0 : i % delays.length] ?? '0ms');

      // Check for existing transition on this property — cancel and start from current value
      const existing = this.#findTransition(element, prop);
      const startValue = existing ? this.#getCurrentValue(existing, timestamp) : oldVal;

      if (existing) {
        this.#removeTransition(existing);
      }

      this.#active.push({
        element,
        property: prop,
        startValue,
        endValue: newVal,
        startTime: timestamp,
        duration,
        delay,
        easing,
      });
    }
  }

  /**
   * Computes current transition values for a given timestamp.
   *
   * @param element - The element to get transition values for.
   * @param timestamp - Current frame timestamp.
   * @returns Map of property → interpolated value.
   */
  getValues(element: Element, timestamp: number): Map<string, string> {
    const values = new Map<string, string>();

    for (const t of this.#active) {
      if (t.element !== element) continue;

      const value = this.#getCurrentValue(t, timestamp);
      values.set(t.property, value);
    }

    return values;
  }

  /**
   * Removes completed transitions.
   *
   * @param timestamp - Current frame timestamp.
   * @returns Elements that had transitions complete this frame.
   */
  removeCompleted(timestamp: number): Set<Element> {
    const completed = new Set<Element>();

    this.#active = this.#active.filter((t) => {
      const elapsed = timestamp - t.startTime - t.delay;

      if (elapsed >= t.duration) {
        completed.add(t.element);
        return false;
      }

      return true;
    });

    return completed;
  }

  /** Removes all transitions for an element. */
  removeElement(element: Element): void {
    this.#active = this.#active.filter((t) => t.element !== element);
  }

  #getCurrentValue(t: ActiveTransition, timestamp: number): string {
    const elapsed = timestamp - t.startTime - t.delay;

    if (elapsed <= 0) return t.startValue;
    if (elapsed >= t.duration) return t.endValue;

    const progress = elapsed / t.duration;
    const eased = evaluateEasing(parseEasingValue(t.easing), progress);
    return interpolateValue(t.property, t.startValue, t.endValue, eased);
  }

  #findTransition(element: Element, property: string): ActiveTransition | undefined {
    return this.#active.find((t) => t.element === element && t.property === property);
  }

  #removeTransition(transition: ActiveTransition): void {
    const idx = this.#active.indexOf(transition);
    if (idx !== -1) this.#active.splice(idx, 1);
  }

  #getChangedAnimatableProperties(oldStyle: ComputedStyle, newStyle: ComputedStyle): string[] {
    const changed: string[] = [];

    for (const [prop] of Object.entries(ANIMATABLE_PROPERTIES)) {
      const oldVal = oldStyle.get(prop);
      const newVal = newStyle.get(prop);

      if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
        changed.push(prop);
      }
    }

    return changed;
  }
}
