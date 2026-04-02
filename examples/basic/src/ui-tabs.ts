import {UiTabs, UiTab} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiTabs.tagName, UiTabs);
window.customElements.define(UiTab.tagName, UiTab);

const style = document.createElement('style');
style.textContent = `
  ui-tabs:focus .ui-tabs-bar div[data-active] { color: #c4b5fd; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'ui-tabs',
  'Focus tabs, Arrow Left/Right to switch. Click tab headers.',
);
const status = createStatus(document, 'Active: Tab 1');

/* ── Basic tabs ────────────────────────────────────────── */
const s1 = createSection(document, 'Basic tabs');
const tabs1 = document.createElement('ui-tabs') as InstanceType<typeof UiTabs>;
tabs1.setAttribute('tabindex', '0');
const names1 = ['Overview', 'Details', 'Settings'];
for (const [title, content] of [
  ['Overview', 'General information and summary.\nThis is the overview panel.'],
  ['Details', 'Detailed specifications and data.\nCPU: 42%  Memory: 3.2GB'],
  ['Settings', 'Configuration options.\nTheme: dark\nLanguage: en'],
]) {
  const tab = document.createElement('ui-tab');
  tab.setAttribute('title', title!);
  tab.textContent = content!;
  tabs1.appendChild(tab);
}
tabs1.addEventListener('input', () => {
  status.textContent = `Active: ${names1[(tabs1 as UiTabs).getActiveIndex()]}`;
});
s1.appendChild(tabs1);
app.appendChild(s1);

/* ── Many tabs ─────────────────────────────────────────── */
const s2 = createSection(document, 'Many tabs');
const tabs2 = document.createElement('ui-tabs') as InstanceType<typeof UiTabs>;
tabs2.setAttribute('tabindex', '0');
for (let i = 1; i <= 8; i++) {
  const tab = document.createElement('ui-tab');
  tab.setAttribute('title', `Tab ${i}`);
  tab.textContent = `Content for tab ${i}`;
  tabs2.appendChild(tab);
}
tabs2.addEventListener('input', () => {
  status.textContent = `Many tabs: active index ${(tabs2 as UiTabs).getActiveIndex()}`;
});
s2.appendChild(tabs2);
app.appendChild(s2);

/* ── Single tab ────────────────────────────────────────── */
const s3 = createSection(document, 'Single tab');
const tabs3 = document.createElement('ui-tabs') as InstanceType<typeof UiTabs>;
tabs3.setAttribute('tabindex', '0');
const singleTab = document.createElement('ui-tab');
singleTab.setAttribute('title', 'Only tab');
singleTab.textContent = 'There is only one tab here.';
tabs3.appendChild(singleTab);
s3.appendChild(tabs3);
app.appendChild(s3);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
