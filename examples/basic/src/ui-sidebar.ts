import {UiSidebar, Button} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiSidebar.tagName, UiSidebar);
window.customElements.define(Button.tagName, Button);

const style = document.createElement('style');
style.textContent = `
  ui-sidebar { border-style: single; border-color: #475569; padding: 1; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-sidebar',
  'Fixed-width panel that can be collapsed/expanded.',
);
const status = createStatus(document, 'Sidebar: visible');

/* ── Basic sidebar ─────────────────────────────────────── */
const s1 = createSection(document, 'Toggle sidebar');
const layout = document.createElement('div');
layout.className = 'row';

const sidebar = document.createElement('ui-sidebar') as InstanceType<typeof UiSidebar>;
sidebar.setAttribute('width', '25');
const nav1 = document.createElement('div');
nav1.textContent = '📁 Documents';
const nav2 = document.createElement('div');
nav2.textContent = '📁 Pictures';
const nav3 = document.createElement('div');
nav3.textContent = '📁 Downloads';
sidebar.appendChild(nav1);
sidebar.appendChild(nav2);
sidebar.appendChild(nav3);

const content = document.createElement('div');
content.style.flexGrow = '1';
content.textContent = 'Main content area. Toggle the sidebar with the button below.';

layout.appendChild(sidebar);
layout.appendChild(content);

const toggleBtn = document.createElement('button');
toggleBtn.setAttribute('variant', 'primary');
toggleBtn.setAttribute('tabindex', '0');
toggleBtn.textContent = 'Toggle sidebar';
toggleBtn.addEventListener('click', () => {
  sidebar.toggle();
  status.textContent = `Sidebar: ${sidebar.isCollapsed() ? 'collapsed' : 'visible'}`;
});

s1.appendChild(layout);
s1.appendChild(toggleBtn);
app.appendChild(s1);

/* ── Different widths ──────────────────────────────────── */
const s2 = createSection(document, 'Width comparison');
for (const w of [15, 25, 40]) {
  const sb = document.createElement('ui-sidebar') as InstanceType<typeof UiSidebar>;
  sb.setAttribute('width', String(w));
  sb.textContent = `Width: ${w}`;
  s2.appendChild(sb);
}
app.appendChild(s2);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
