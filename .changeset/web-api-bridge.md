---
"@cliui/dom": minor
"@cliui/terminal": minor
---

Wire standard Web APIs to terminal escape sequences

- `document.title` / `<title>` → OSC 2 window/tab title
- `document.hasFocus()` / `document.visibilityState` from terminal focus
- `window.alert()`, `window.confirm()`, `window.prompt()` as async modal dialogs
- `Notification` API → OSC 9/OSC 777/BEL desktop notifications
- `navigator.clipboard` → OSC 52 with in-memory fallback
- `window.matchMedia('(prefers-color-scheme)')` with MediaQueryList change events
- `window.location.pathname` → OSC 7 CWD reporting
- CSS `cursor` property → terminal cursor shape changes on focus
