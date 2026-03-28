// Bootstrap: install the global polyfill before Vue captures `document`
import '@micra/terminal-dom';

// Dynamic import ensures Vue loads after the polyfill is installed
await import('./app.js');
