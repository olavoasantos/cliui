import type {MediaCondition} from '../types/MediaCondition';
import type {ContainerValues} from '../types/ContainerValues';

/**
 * Evaluates a parsed container condition against a container element's
 * resolved dimensions.
 *
 * Supports the same syntax as media conditions but only evaluates
 * dimensional features (`width`, `height`, `min-width`, `max-width`,
 * `min-height`, `max-height`, `orientation`). Preference features
 * (`prefers-color-scheme`, `prefers-reduced-motion`) are rejected
 * and return `false`.
 *
 * @param condition - The parsed condition AST (same type as media conditions).
 * @param values - The container element's resolved content dimensions.
 * @returns `true` if the condition matches, `false` otherwise.
 */
export function evaluateContainerCondition(condition: MediaCondition, values: ContainerValues): boolean {
  switch (condition.type) {
    case 'feature':
      return evaluateContainerFeature(condition.name, condition.value, values);
    case 'not':
      return !evaluateContainerCondition(condition.condition, values);
    case 'and':
      return condition.conditions.every((c) => evaluateContainerCondition(c, values));
    case 'or':
      return condition.conditions.some((c) => evaluateContainerCondition(c, values));
  }
}

/**
 * Evaluates a single container feature against the container dimensions.
 * Preference features are invalid in container queries and return false.
 */
function evaluateContainerFeature(name: string, value: string, values: ContainerValues): boolean {
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
    case 'orientation': {
      const orientation = values.width > values.height ? 'landscape' : 'portrait';
      return orientation === value.trim().toLowerCase();
    }
    // Preference features are NOT valid in container queries
    case 'prefers-color-scheme':
    case 'prefers-reduced-motion':
      return false;
    default:
      return false;
  }
}

/**
 * Parses a numeric value from a condition expression.
 */
function parseNumericValue(value: string): number {
  const num = Number(value.trim());
  return Number.isNaN(num) ? 0 : num;
}
