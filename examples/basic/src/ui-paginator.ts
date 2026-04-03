import {Paginator} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Paginator.tagName, Paginator);

const style = document.createElement('style');
style.textContent = `
  paginator { border-style: single; border-color: #475569; padding: 0 1; }
  paginator:focus { border-color: #7c3aed; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'paginator',
  'Focus the paginator, Arrow Left/Right to change pages.',
);
const status = createStatus(document, 'Page: 1');

/* ── Basic ─────────────────────────────────────────────── */
const s1 = createSection(document, 'Basic (10 pages)');
const pag1 = document.createElement('paginator') as InstanceType<typeof Paginator>;
pag1.setAttribute('tabindex', '0');
pag1.setAttribute('page', '1');
pag1.setAttribute('total-pages', '10');
pag1.addEventListener('change', () => {
  status.textContent = `Page: ${pag1.getPage()} of ${pag1.getTotalPages()}`;
});
s1.appendChild(pag1);
app.appendChild(s1);

/* ── Small ─────────────────────────────────────────────── */
const s2 = createSection(document, 'Small (3 pages, start at 2)');
const pag2 = document.createElement('paginator') as InstanceType<typeof Paginator>;
pag2.setAttribute('tabindex', '0');
pag2.setAttribute('page', '2');
pag2.setAttribute('total-pages', '3');
pag2.addEventListener('change', () => {
  status.textContent = `Small: page ${pag2.getPage()} of ${pag2.getTotalPages()}`;
});
s2.appendChild(pag2);
app.appendChild(s2);

/* ── Large (truncated) ─────────────────────────────────── */
const s3 = createSection(document, 'Large (50 pages — truncated)');
const pag3 = document.createElement('paginator') as InstanceType<typeof Paginator>;
pag3.setAttribute('tabindex', '0');
pag3.setAttribute('page', '1');
pag3.setAttribute('total-pages', '50');
pag3.addEventListener('change', () => {
  status.textContent = `Large: page ${pag3.getPage()} of ${pag3.getTotalPages()}`;
});
s3.appendChild(pag3);
app.appendChild(s3);

/* ── Single page ───────────────────────────────────────── */
const s4 = createSection(document, 'Single page (no navigation)');
const pag4 = document.createElement('paginator') as InstanceType<typeof Paginator>;
pag4.setAttribute('tabindex', '0');
pag4.setAttribute('page', '1');
pag4.setAttribute('total-pages', '1');
s4.appendChild(pag4);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
