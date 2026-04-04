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
    case 'transition':
      return expandTransitionShorthand(value);
    case 'animation':
      return expandAnimationShorthand(value);
    default:
      return null;
  }
}

const TIME_RE = /^\d*\.?\d+(ms|s)$/;
const EASING_KEYWORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out']);
const DIRECTION_KEYWORDS = new Set(['normal', 'reverse', 'alternate', 'alternate-reverse']);
const FILL_MODE_KEYWORDS = new Set(['none', 'forwards', 'backwards', 'both']);
const PLAY_STATE_KEYWORDS = new Set(['running', 'paused']);

/**
 * Expands the `transition` shorthand into its four component properties.
 *
 * `transition: color 200ms ease 100ms, background-color 300ms`
 * → `transition-property: color, background-color`
 *   `transition-duration: 200ms, 300ms`
 *   `transition-timing-function: ease, ease`
 *   `transition-delay: 100ms, 0ms`
 */
function expandTransitionShorthand(value: string): Record<string, string> {
  const layers = splitCommaLayers(value);
  const properties: string[] = [];
  const durations: string[] = [];
  const timingFunctions: string[] = [];
  const delays: string[] = [];

  for (const layer of layers) {
    const tokens = tokenize(layer);
    let property = 'all';
    let duration = '0ms';
    let timingFunction = 'ease';
    let delay = '0ms';
    let timeCount = 0;

    for (const token of tokens) {
      if (TIME_RE.test(token)) {
        if (timeCount === 0) {
          duration = token;
        } else {
          delay = token;
        }
        timeCount++;
      } else if (
        EASING_KEYWORDS.has(token) ||
        token.startsWith('cubic-bezier(') ||
        token.startsWith('steps(')
      ) {
        timingFunction = token;
      } else {
        property = token;
      }
    }

    properties.push(property);
    durations.push(duration);
    timingFunctions.push(timingFunction);
    delays.push(delay);
  }

  return {
    'transition-property': properties.join(', '),
    'transition-duration': durations.join(', '),
    'transition-timing-function': timingFunctions.join(', '),
    'transition-delay': delays.join(', '),
  };
}

/**
 * Expands the `animation` shorthand into its eight component properties.
 *
 * `animation: fadeIn 1s ease-out 0s 1 normal forwards running`
 */
function expandAnimationShorthand(value: string): Record<string, string> {
  const layers = splitCommaLayers(value);
  const names: string[] = [];
  const durations: string[] = [];
  const timingFunctions: string[] = [];
  const delays: string[] = [];
  const iterationCounts: string[] = [];
  const directions: string[] = [];
  const fillModes: string[] = [];
  const playStates: string[] = [];

  for (const layer of layers) {
    const tokens = tokenize(layer);
    let name = 'none';
    let duration = '0ms';
    let timingFunction = 'ease';
    let delay = '0ms';
    let iterationCount = '1';
    let direction = 'normal';
    let fillMode = 'none';
    let playState = 'running';
    let timeCount = 0;
    let nameAssigned = false;

    for (const token of tokens) {
      if (TIME_RE.test(token)) {
        if (timeCount === 0) {
          duration = token;
        } else {
          delay = token;
        }
        timeCount++;
      } else if (
        EASING_KEYWORDS.has(token) ||
        token.startsWith('cubic-bezier(') ||
        token.startsWith('steps(')
      ) {
        timingFunction = token;
      } else if (token === 'infinite' || /^\d+(\.\d+)?$/.test(token)) {
        iterationCount = token;
      } else if (DIRECTION_KEYWORDS.has(token)) {
        direction = token;
      } else if (FILL_MODE_KEYWORDS.has(token) && token !== 'none') {
        fillMode = token;
      } else if (PLAY_STATE_KEYWORDS.has(token)) {
        playState = token;
      } else if (!nameAssigned) {
        name = token;
        nameAssigned = true;
      }
    }

    names.push(name);
    durations.push(duration);
    timingFunctions.push(timingFunction);
    delays.push(delay);
    iterationCounts.push(iterationCount);
    directions.push(direction);
    fillModes.push(fillMode);
    playStates.push(playState);
  }

  return {
    'animation-name': names.join(', '),
    'animation-duration': durations.join(', '),
    'animation-timing-function': timingFunctions.join(', '),
    'animation-delay': delays.join(', '),
    'animation-iteration-count': iterationCounts.join(', '),
    'animation-direction': directions.join(', '),
    'animation-fill-mode': fillModes.join(', '),
    'animation-play-state': playStates.join(', '),
  };
}

/** Splits a CSS value by top-level commas, respecting parentheses. */
function splitCommaLayers(value: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);

    if (ch === 0x28 /* ( */) depth++;
    else if (ch === 0x29 /* ) */) depth--;
    else if (ch === 0x2c /* , */ && depth === 0) {
      layers.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }

  const last = value.slice(start).trim();
  if (last) layers.push(last);

  return layers;
}

/** Tokenizes a CSS value layer, keeping function calls as single tokens. */
function tokenize(layer: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = layer.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && layer.charCodeAt(i) <= 0x20) i++;
    if (i >= len) break;

    let start = i;

    // Function call — consume until matching )
    if (i < len) {
      let foundParen = false;

      while (i < len && layer.charCodeAt(i) > 0x20) {
        if (layer.charCodeAt(i) === 0x28 /* ( */) {
          foundParen = true;
          let depth = 1;
          i++;

          while (i < len && depth > 0) {
            if (layer.charCodeAt(i) === 0x28) depth++;
            else if (layer.charCodeAt(i) === 0x29) depth--;
            i++;
          }

          break;
        }

        i++;
      }

      if (!foundParen) {
        // Regular token — already advanced past it
      }
    }

    if (i > start) {
      tokens.push(layer.slice(start, i));
    }
  }

  return tokens;
}
