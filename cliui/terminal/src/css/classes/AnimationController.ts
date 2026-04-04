import {resolveKeyframe} from '../utilities/resolveKeyframe';
import {parseEasingValue} from '../utilities/parseEasingValue';

import type {Element} from '@cliui/dom';
import type {ComputedStyle} from '../types';
import type {KeyframeBlock} from '../types/KeyframeRule';
import type {ActiveAnimation} from '../types/ActiveAnimation';

/**
 * Manages active `@keyframes` animations per element.
 *
 * Tracks animation state including iteration count, direction, fill mode,
 * and play state. Computes current animated values each frame by delegating
 * to the keyframe resolver.
 */
export class AnimationController {
  #active: ActiveAnimation[] = [];

  /** Returns true when there are active animations. */
  get hasActive(): boolean {
    return this.#active.length > 0;
  }

  /** Returns all elements that currently have active animations. */
  getActiveElements(): Set<Element> {
    const elements = new Set<Element>();
    for (const a of this.#active) {
      elements.add(a.element);
    }
    return elements;
  }

  /**
   * Starts an animation on an element.
   *
   * @param element - Target element.
   * @param name - The `@keyframes` name.
   * @param keyframes - Parsed keyframe blocks.
   * @param options - Animation configuration from CSS properties.
   * @param timestamp - Current frame timestamp.
   */
  startAnimation(
    element: Element,
    name: string,
    keyframes: KeyframeBlock[],
    options: {
      duration: number;
      delay: number;
      easing: string;
      iterationCount: number;
      direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
      fillMode: 'none' | 'forwards' | 'backwards' | 'both';
      playState: 'running' | 'paused';
    },
    timestamp: number,
  ): void {
    this.#active.push({
      element,
      name,
      keyframes,
      startTime: timestamp,
      duration: options.duration,
      delay: options.delay,
      easing: options.easing,
      iterationCount: options.iterationCount,
      direction: options.direction,
      fillMode: options.fillMode,
      playState: options.playState,
      pausedElapsed: 0,
      pausedAt: options.playState === 'paused' ? timestamp : 0,
      currentIteration: 0,
    });
  }

  /**
   * Computes current animation values for a given element and timestamp.
   *
   * @param element - The element to get animation values for.
   * @param timestamp - Current frame timestamp.
   * @param baseStyle - The element's computed style for implicit keyframes.
   * @returns Map of property → animated value.
   */
  getValues(element: Element, timestamp: number, baseStyle?: ComputedStyle): Map<string, string> {
    const result = new Map<string, string>();

    for (const anim of this.#active) {
      if (anim.element !== element) continue;

      const values = this.#computeValues(anim, timestamp, baseStyle);

      for (const [prop, val] of values) {
        result.set(prop, val);
      }
    }

    return result;
  }

  /**
   * Removes completed animations and returns affected elements.
   *
   * @param timestamp - Current frame timestamp.
   */
  removeCompleted(timestamp: number): Set<Element> {
    const completed = new Set<Element>();

    this.#active = this.#active.filter((anim) => {
      if (anim.iterationCount === Infinity) return true;
      if (anim.playState === 'paused') return true;

      const elapsed = this.#getElapsed(anim, timestamp);

      if (elapsed >= anim.delay + anim.duration * anim.iterationCount) {
        completed.add(anim.element);
        return false;
      }

      return true;
    });

    return completed;
  }

  /** Removes all animations with a given name for an element. */
  removeAnimation(element: Element, name: string): void {
    this.#active = this.#active.filter((a) => !(a.element === element && a.name === name));
  }

  /** Removes all animations for an element. */
  removeElement(element: Element): void {
    this.#active = this.#active.filter((a) => a.element !== element);
  }

  /** Updates play state for an animation. */
  setPlayState(
    element: Element,
    name: string,
    state: 'running' | 'paused',
    timestamp: number,
  ): void {
    for (const anim of this.#active) {
      if (anim.element !== element || anim.name !== name) continue;

      if (state === 'paused' && anim.playState === 'running') {
        anim.pausedAt = timestamp;
        anim.playState = 'paused';
      } else if (state === 'running' && anim.playState === 'paused') {
        anim.pausedElapsed += timestamp - anim.pausedAt;
        anim.pausedAt = 0;
        anim.playState = 'running';
      }
    }
  }

  #computeValues(
    anim: ActiveAnimation,
    timestamp: number,
    baseStyle?: ComputedStyle,
  ): Map<string, string> {
    const elapsed = this.#getElapsed(anim, timestamp);
    const totalDuration =
      anim.duration * (anim.iterationCount === Infinity ? 1 : anim.iterationCount);

    // Before delay — backwards fill mode
    if (elapsed < anim.delay) {
      if (anim.fillMode === 'backwards' || anim.fillMode === 'both') {
        const progress = this.#applyDirection(0, anim.direction, 0);
        return resolveKeyframe(anim.keyframes, progress, parseEasingValue(anim.easing), baseStyle);
      }
      return new Map();
    }

    const activeElapsed = elapsed - anim.delay;

    // After completion — forwards fill mode
    if (anim.iterationCount !== Infinity && activeElapsed >= totalDuration) {
      if (anim.fillMode === 'forwards' || anim.fillMode === 'both') {
        const lastIteration = anim.iterationCount - 1;
        const progress = this.#applyDirection(1, anim.direction, lastIteration);
        return resolveKeyframe(anim.keyframes, progress, parseEasingValue(anim.easing), baseStyle);
      }
      return new Map();
    }

    // Active phase
    const iteration = Math.floor(activeElapsed / anim.duration);
    const iterationProgress =
      anim.duration > 0 ? (activeElapsed % anim.duration) / anim.duration : 0;
    const progress = this.#applyDirection(iterationProgress, anim.direction, iteration);

    return resolveKeyframe(anim.keyframes, progress, parseEasingValue(anim.easing), baseStyle);
  }

  #getElapsed(anim: ActiveAnimation, timestamp: number): number {
    if (anim.playState === 'paused') {
      return anim.pausedAt - anim.startTime - anim.pausedElapsed;
    }
    return timestamp - anim.startTime - anim.pausedElapsed;
  }

  #applyDirection(
    progress: number,
    direction: ActiveAnimation['direction'],
    iteration: number,
  ): number {
    switch (direction) {
      case 'normal':
        return progress;
      case 'reverse':
        return 1 - progress;
      case 'alternate':
        return iteration % 2 === 0 ? progress : 1 - progress;
      case 'alternate-reverse':
        return iteration % 2 === 0 ? 1 - progress : progress;
    }
  }
}
