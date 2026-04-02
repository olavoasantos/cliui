<p align="center">
  <img src="./.config/assets/cliui-elements.png" style="width: 200px; max-width: 25%;" />
</p>

<h1 align="center">@cliui/elements</h1>

<p align="center">
  <a href="https://github.com/olavoasantos/cliui/blob/latest/docs">Documentation</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CONTRIBUTING.md">Contributing</a> •
  <a href="https://github.com/olavoasantos/cliui/blob/latest/CODE_OF_CONDUCT.md">Code of Conduct</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/npm/v/@cliui/elements?color=%23F3626C&logo=npm" />
  <img alt="issues" src="https://img.shields.io/github/issues-search/olavoasantos/cliui?color=%23F3626C&label=Issues&logo=github&query=is%3Aopen%20label%3A%22Project%3A%20elements%22" />
  <img alt="prs" src="https://img.shields.io/github/issues-pr/olavoasantos/cliui?color=%23F3626C&label=Pull%20requests&logo=github" />
</p>

## About

`@cliui/elements` is a terminal UI component library built on top of `@cliui/terminal`. It provides ready-to-use custom elements — buttons, inputs, tables, menus, progress bars, and more — that you register and use like standard HTML elements.

All components are implemented as custom elements via `CustomElementRegistry`. They come with built-in styles, keyboard navigation, and accessibility patterns adapted for the terminal.

### Components

| Category | Elements |
|----------|----------|
| **Form** | `<ui-button>`, `<ui-input>`, `<ui-textarea>`, `<ui-select>`, `<ui-option>`, `<ui-optgroup>`, `<ui-label>`, `<ui-fieldset>`, `<ui-form>` |
| **Data** | `<ui-table>`, `<ui-thead>`, `<ui-tbody>`, `<ui-tfoot>`, `<ui-tr>`, `<ui-th>`, `<ui-td>`, `<ui-list>`, `<ui-tree>` |
| **Feedback** | `<ui-progress>`, `<ui-meter>`, `<ui-spinner>`, `<ui-skeleton>`, `<ui-toast>`, `<ui-message>` |
| **Navigation** | `<ui-tabs>`, `<ui-tab>`, `<ui-menu>`, `<ui-menuitem>`, `<ui-dropdown>`, `<ui-breadcrumbs>`, `<ui-paginator>` |
| **Layout** | `<ui-card>`, `<ui-sidebar>`, `<ui-toolbar>`, `<ui-statusline>` |
| **Overlay** | `<ui-confirmation>`, `<ui-prompt>`, `<ui-details>` |
| **Content** | `<ui-badge>`, `<ui-codeblock>`, `<ui-diff>`, `<ui-log>` |

## Usage

```shell
pnpm install @cliui/elements
```

```ts
import {Terminal} from '@cliui/terminal';
import {UiButton, UiInput, UiCard} from '@cliui/elements';

const terminal = new Terminal();
const doc = terminal.document;

// Register components
doc.defaultView.customElements.define(UiCard.tagName, UiCard);
doc.defaultView.customElements.define(UiInput.tagName, UiInput);
doc.defaultView.customElements.define(UiButton.tagName, UiButton);

// Use them like HTML
const card = doc.createElement('ui-card');
card.setAttribute('title', 'Login');

const input = doc.createElement('ui-input');
input.setAttribute('placeholder', 'Username');

const button = doc.createElement('ui-button');
button.textContent = 'Submit';

card.appendChild(input);
card.appendChild(button);
doc.body.appendChild(card);

await terminal.run();
```

## Inspirations

- **[Bubbles](https://github.com/charmbracelet/bubbles)** — Component patterns for spinner (frame-based animation), progress bar (gradient fill with color blending), text input (cursor management, Unicode width, paste handling), and viewport (scrollable content).
- **[Huh](https://github.com/charmbracelet/huh)** — Form patterns including input validation, placeholder handling, and theming.
- **[Harmonica](https://github.com/charmbracelet/harmonica)** — Spring physics for smooth progress bar animation.

## Contributors

- [Olavo Amorim Santos](https://github.com/olavoasantos)
