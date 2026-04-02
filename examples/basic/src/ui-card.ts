import {UiCard} from '@cliui/elements';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiCard.tagName, UiCard);

const style = document.createElement('style');
style.textContent = `
  ui-card { border-color: #475569; }
  ui-card .ui-card-header { color: #fbbf24; }
  ui-card .ui-card-footer { color: #64748b; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-card',
  'Bordered content card with optional header and footer.',
);

/* ── Header + content + footer ─────────────────────────── */

const s1 = createSection(document, 'Full card');
const card1 = document.createElement('ui-card');
card1.setAttribute('header', 'Server Status');
card1.setAttribute('footer', 'Updated 2 minutes ago');
const content1 = document.createElement('div');
content1.textContent = 'CPU: 42%  |  Memory: 3.2 GB  |  Disk: 67%';
card1.appendChild(content1);
s1.appendChild(card1);
app.appendChild(s1);

/* ── Header only ───────────────────────────────────────── */

const s2 = createSection(document, 'Header only');
const card2 = document.createElement('ui-card');
card2.setAttribute('header', 'Notifications');
const n1 = document.createElement('div');
n1.textContent = '• Build completed successfully';
const n2 = document.createElement('div');
n2.textContent = '• 3 new pull requests';
const n3 = document.createElement('div');
n3.textContent = '• Deployment pending approval';
card2.appendChild(n1);
card2.appendChild(n2);
card2.appendChild(n3);
s2.appendChild(card2);
app.appendChild(s2);

/* ── No header or footer ──────────────────────────────── */

const s3 = createSection(document, 'Content only (no header/footer)');
const card3 = document.createElement('ui-card');
const plain = document.createElement('div');
plain.textContent = 'Just a bordered container with padding.';
card3.appendChild(plain);
s3.appendChild(card3);
app.appendChild(s3);

/* ── Footer only ───────────────────────────────────────── */

const s4 = createSection(document, 'Footer only');
const card4 = document.createElement('ui-card');
card4.setAttribute('footer', 'v2.1.0 — MIT License');
const body4 = document.createElement('div');
body4.textContent = 'Package info card with just a footer.';
card4.appendChild(body4);
s4.appendChild(card4);
app.appendChild(s4);

document.body.appendChild(app);
await terminal.run();
