import {UiPaginator} from '@micra/terminal-dom/components';
import {createDemo, createShell, createSection, createStatus} from './_helpers';

const {terminal, document, window} = createDemo();
window.customElements.define(UiPaginator.tagName, UiPaginator);

const style = document.createElement('style');
style.textContent = `
  ui-paginator { border-style: single; border-color: #475569; padding: 0 1; }
  ui-paginator:focus { border-color: #7c3aed; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-paginator',
  'Focus the paginator, Arrow Left/Right to change pages.',
);
const status = createStatus(document, 'Page: 1');

/* ── Basic ─────────────────────────────────────────────── */
const s1 = createSection(document, 'Basic (10 pages)');
const pag1 = document.createElement('ui-paginator') as InstanceType<typeof UiPaginator>;
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
const pag2 = document.createElement('ui-paginator') as InstanceType<typeof UiPaginator>;
pag2.setAttribute('tabindex', '0');
pag2.setAttribute('page', '2');
pag2.setAttribute('total-pages', '3');
pag2.addEventListener('change', () => {
  status.textContent = `Small: page ${pag2.getPage()} of ${pag2.getTotalPages()}`;
});
s2.appendChild(pag2);
app.appendChild(s2);

/* ── Single page ───────────────────────────────────────── */
const s3 = createSection(document, 'Single page (no navigation)');
const pag3 = document.createElement('ui-paginator') as InstanceType<typeof UiPaginator>;
pag3.setAttribute('tabindex', '0');
pag3.setAttribute('page', '1');
pag3.setAttribute('total-pages', '1');
s3.appendChild(pag3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
