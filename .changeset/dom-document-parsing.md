---
"@cliui/dom": minor
"@cliui/terminal": minor
---

Add document parsing with HTML entry points

Parse full HTML documents (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`), load external stylesheets via `<link rel="stylesheet">`, and execute scripts in a VM context sharing the terminal's window scope. New DOM classes: HTMLScriptElement, HTMLLinkElement. New Terminal API: `Terminal.loadDocument()` and `Terminal.loadFile()`. Fire document lifecycle events (DOMContentLoaded, load).
