/** Expands a shorthand CSS property into its longhand equivalents. */
export function expandShorthand(property: string, value: string): Record<string, string> | null {
  const parts = value.trim().split(/\s+/);

  switch (property) {
    case 'padding':
    case 'margin': {
      const [top, right = top, bottom = top, left = right] = parts as [string, ...string[]];
      return {
        [`${property}-top`]: top!,
        [`${property}-right`]: right!,
        [`${property}-bottom`]: bottom!,
        [`${property}-left`]: left!,
      };
    }
    case 'gap': {
      const [row, column = row] = parts as [string, ...string[]];
      return {
        'row-gap': row!,
        'column-gap': column!,
      };
    }
    case 'flex': {
      if (parts.length === 1) {
        const singleValue = parts[0]!;
        if (singleValue === 'none') {
          return {'flex-grow': '0', 'flex-shrink': '0', 'flex-basis': 'auto'};
        }
        if (singleValue === 'auto') {
          return {'flex-grow': '1', 'flex-shrink': '1', 'flex-basis': 'auto'};
        }
        return {'flex-grow': singleValue, 'flex-shrink': '1', 'flex-basis': '0'};
      }
      if (parts.length === 2) {
        return {
          'flex-grow': parts[0]!,
          'flex-shrink': parts[1]!,
          'flex-basis': '0',
        };
      }
      if (parts.length === 3) {
        return {
          'flex-grow': parts[0]!,
          'flex-shrink': parts[1]!,
          'flex-basis': parts[2]!,
        };
      }
      return null;
    }
    default:
      return null;
  }
}
