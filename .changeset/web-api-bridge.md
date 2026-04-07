---
'@cliui/dom': minor
'@cliui/terminal': minor
---

Wire standard Web APIs to terminal escape sequences (Milestone 13).

- `document.title` / `<title>` → OSC 2 window/tab title with push/pop on start/stop
- `<a href>` → OSC 8 clickable hyperlinks (already wired in painter, verified)
- `document.hasFocus()` / `document.visibilityState` + `visibilitychange` event from terminal focus
- `window.alert()`, `window.confirm()`, `window.prompt()` as async modal dialogs using `<dialog>`
- `Notification` API → OSC 9 (iTerm2/Konsole), OSC 777 (rxvt), BEL fallback
- `navigator.clipboard.writeText()` / `readText()` via OSC 52 with in-memory fallback
- `window.matchMedia('(prefers-color-scheme: dark|light)')` with `MediaQueryList` change events
- `window.location.pathname` → OSC 7 CWD reporting for terminal "New Tab Here"
- CSS `cursor` property (`text|default|pointer|wait|none`) → terminal cursor shape on focus change
