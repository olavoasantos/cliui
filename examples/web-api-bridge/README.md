# Web API ↔ Terminal Bridge Example

Demonstrates all the Web API bridges implemented in Milestone 13:

1. **Document title** — `document.title` → terminal window/tab title (OSC 2)
2. **Anchor hyperlinks** — `<a href>` → clickable terminal links (OSC 8)
3. **Focus state** — `document.hasFocus()` and `document.visibilityState`
4. **Window dialogs** — `alert()`, `confirm()`, `prompt()` as async modal dialogs
5. **Notifications** — `new Notification()` → terminal notifications (OSC 9/777/BEL)
6. **Clipboard** — `navigator.clipboard.writeText()`/`readText()` via OSC 52
7. **Color scheme** — `window.matchMedia('(prefers-color-scheme: dark)')` via terminal color query
8. **CWD reporting** — `window.location.pathname` → OSC 7
9. **CSS cursor** — `cursor: text|default|pointer|wait|none` → terminal cursor shape

## Run

```bash
pnpm install
pnpm start
```

Press **1–9** to try each feature. Press **q** to exit.
