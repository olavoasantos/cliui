import type {EasingDescriptor} from '../types/EasingDescriptor';

/**
 * Evaluates a CSS easing function at a given progress value.
 *
 * @param easing - The easing function descriptor.
 * @param progress - Input progress in the range 0–1.
 * @returns The eased output value.
 */
export function evaluateEasing(easing: EasingDescriptor, progress: number): number {
  switch (easing.type) {
    case 'linear':
      return progress;
    case 'cubic-bezier':
      return evaluateCubicBezier(easing.x1, easing.y1, easing.x2, easing.y2, progress);
    case 'steps':
      return evaluateSteps(easing.count, easing.position, progress);
  }
}

/**
 * Resolves a named CSS easing keyword to its `EasingDescriptor`.
 *
 * @param keyword - A named easing keyword (e.g. `'ease'`, `'ease-in-out'`).
 * @returns The corresponding descriptor, or a linear descriptor for unknown keywords.
 */
export function resolveEasingKeyword(keyword: string): EasingDescriptor {
  switch (keyword) {
    case 'linear':
      return {type: 'linear'};
    case 'ease':
      return {type: 'cubic-bezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1.0};
    case 'ease-in':
      return {type: 'cubic-bezier', x1: 0.42, y1: 0, x2: 1.0, y2: 1.0};
    case 'ease-out':
      return {type: 'cubic-bezier', x1: 0, y1: 0, x2: 0.58, y2: 1.0};
    case 'ease-in-out':
      return {type: 'cubic-bezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1.0};
    default:
      return {type: 'linear'};
  }
}

// Newton-Raphson iteration to find t for a given x on a cubic bezier curve.
// Falls back to binary search if Newton-Raphson fails to converge.
const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_MAX_ITERATIONS = 20;
const SUBDIVISION_PRECISION = 0.0000001;

function evaluateCubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (x1 === y1 && x2 === y2) return x;

  const t = findTForX(x1, x2, x);
  // B(t) = 3*(1-t)^2*t*p1 + 3*(1-t)*t^2*p2 + t^3
  const oneMinusT = 1 - t;
  return 3 * oneMinusT * oneMinusT * t * y1 + 3 * oneMinusT * t * t * y2 + t * t * t;
}

function sampleCurveX(t: number, x1: number, x2: number): number {
  const oneMinusT = 1 - t;
  return 3 * oneMinusT * oneMinusT * t * x1 + 3 * oneMinusT * t * t * x2 + t * t * t;
}

function sampleCurveDerivativeX(t: number, x1: number, x2: number): number {
  // d/dt [3*(1-t)^2*t*x1 + 3*(1-t)*t^2*x2 + t^3]
  return 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
}

function findTForX(x1: number, x2: number, x: number): number {
  // Newton-Raphson
  let t = x;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const slope = sampleCurveDerivativeX(t, x1, x2);
    if (Math.abs(slope) < NEWTON_MIN_SLOPE) break;
    const currentX = sampleCurveX(t, x1, x2) - x;
    t -= currentX / slope;
  }

  // Clamp and verify
  const result = sampleCurveX(t, x1, x2);
  if (Math.abs(result - x) < SUBDIVISION_PRECISION) return t;

  // Binary search fallback
  let low = 0;
  let high = 1;
  t = x;
  for (let i = 0; i < SUBDIVISION_MAX_ITERATIONS; i++) {
    const currentX = sampleCurveX(t, x1, x2);
    if (Math.abs(currentX - x) < SUBDIVISION_PRECISION) return t;
    if (currentX > x) {
      high = t;
    } else {
      low = t;
    }
    t = (low + high) / 2;
  }

  return t;
}

function evaluateSteps(count: number, position: string, progress: number): number {
  // Clamp
  if (progress <= 0) {
    return position === 'jump-start' || position === 'jump-both'
      ? 1 / stepsTotal(count, position)
      : 0;
  }
  if (progress >= 1) return 1;

  const total = stepsTotal(count, position);
  const currentStep = Math.floor(progress * count);

  switch (position) {
    case 'jump-start':
      return (currentStep + 1) / total;
    case 'jump-end':
      return currentStep / total;
    case 'jump-both':
      return (currentStep + 1) / total;
    case 'jump-none':
      return currentStep / total;
    default:
      return currentStep / total;
  }
}

function stepsTotal(count: number, position: string): number {
  switch (position) {
    case 'jump-both':
      return count + 1;
    case 'jump-none':
      return count - 1;
    default:
      return count;
  }
}
