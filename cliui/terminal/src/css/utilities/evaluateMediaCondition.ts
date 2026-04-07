import type {MediaCondition} from '../types';
import type {MediaValues} from '../types';

/**
 * Evaluates a parsed media condition against the current media values.
 *
 * Numeric comparisons use integer cell values. Keyword comparisons are
 * exact string matches. The `orientation` feature is computed from
 * width/height if not directly queried.
 *
 * @param condition - The parsed media condition AST.
 * @param values - Current terminal media values.
 * @returns `true` if the condition matches, `false` otherwise.
 */
export function evaluateMediaCondition(condition: MediaCondition, values: MediaValues): boolean {
  switch (condition.type) {
    case 'feature':
      return evaluateFeature(condition.name, condition.value, values);
    case 'not':
      return !evaluateMediaCondition(condition.condition, values);
    case 'and':
      return condition.conditions.every((c) => evaluateMediaCondition(c, values));
    case 'or':
      return condition.conditions.some((c) => evaluateMediaCondition(c, values));
  }
}

/**
 * Evaluates a single media feature against values.
 */
function evaluateFeature(name: string, value: string, values: MediaValues): boolean {
  switch (name) {
    case 'min-width':
      return values.width >= parseNumericValue(value);
    case 'max-width':
      return values.width <= parseNumericValue(value);
    case 'width':
      return values.width === parseNumericValue(value);
    case 'min-height':
      return values.height >= parseNumericValue(value);
    case 'max-height':
      return values.height <= parseNumericValue(value);
    case 'height':
      return values.height === parseNumericValue(value);
    case 'orientation':
      return values.orientation === value.trim().toLowerCase();
    case 'prefers-color-scheme':
      return values['prefers-color-scheme'] === value.trim().toLowerCase();
    case 'prefers-reduced-motion':
      return values['prefers-reduced-motion'] === value.trim().toLowerCase();
    default:
      // Unsupported features return false
      return false;
  }
}

/**
 * Parses a numeric value from a condition expression.
 * Terminal-dom uses cell units (integers), no unit conversion needed.
 */
function parseNumericValue(value: string): number {
  const num = Number(value.trim());
  return Number.isNaN(num) ? 0 : num;
}
