import {SelectorCombinator, SelectorMatcherType} from '../../dom/constants';

import type {SelectorPart} from '../../dom/types';

/** Serializes parsed selector parts back into a CSS selector string. */
export function serializeSelectorParts(parts: SelectorPart[]): string {
  const segments = parts.map((part) =>
    part.matchers
      .map((matcher) => {
        switch (matcher.type) {
          case SelectorMatcherType.Unknown:
            return '*';
          case SelectorMatcherType.Element:
            return matcher.name;
          case SelectorMatcherType.Id:
            return `#${matcher.name}`;
          case SelectorMatcherType.Class:
            return `.${matcher.name}`;
          case SelectorMatcherType.Attribute:
            return matcher.value != null
              ? `[${matcher.name}="${matcher.value}"]`
              : `[${matcher.name}]`;
          case SelectorMatcherType.Pseudo:
            return `:${matcher.name}`;
          case SelectorMatcherType.Function:
            return `:${matcher.name}(${matcher.value ?? ''})`;
        }
      })
      .join(''),
  );

  if (segments.length === 0) {
    return '';
  }

  let result = segments[0]!;

  for (let index = 0; index < parts.length - 1; index += 1) {
    switch (parts[index]!.combinator) {
      case SelectorCombinator.Descendant:
        result += ' ';
        break;
      case SelectorCombinator.Child:
        result += ' > ';
        break;
      case SelectorCombinator.Sibling:
        result += ' ~ ';
        break;
      case SelectorCombinator.Adjacent:
        result += ' + ';
        break;
    }

    result += segments[index + 1]!;
  }

  return result;
}
