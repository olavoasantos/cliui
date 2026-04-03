import {Details} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(Details.tagName, Details);

const style = document.createElement('style');
style.textContent = `
  details { padding: 0 1; border-style: rounded; border-color: #475569; }
  details:focus { border-color: #7c3aed; }
  details summary { color: #fbbf24; font-weight: bold; }
`;
document.head.appendChild(style);

const app = createShell(
  document,
  'details',
  'Tab to focus, Enter/Space to toggle. Click summary to toggle.',
);

const status = createStatus(document, 'Status: idle');

/* ── Open by default ───────────────────────────────────── */

const s1 = createSection(document, 'Initially open');
const details1 = document.createElement('details') as InstanceType<typeof Details>;
details1.setAttribute('tabindex', '0');
details1.setAttribute('open', '');
const sum1 = document.createElement('summary');
sum1.textContent = 'Configuration';
const content1 = document.createElement('div');
content1.textContent = 'Debug mode: on\nLog level: verbose\nTheme: dark';
details1.appendChild(sum1);
details1.appendChild(content1);
details1.addEventListener('toggle', () => {
  status.textContent = `Config: ${details1.isOpen() ? 'expanded' : 'collapsed'}`;
});
s1.appendChild(details1);
app.appendChild(s1);

/* ── Collapsed by default ──────────────────────────────── */

const s2 = createSection(document, 'Initially collapsed');
const details2 = document.createElement('details') as InstanceType<typeof Details>;
details2.setAttribute('tabindex', '0');
const sum2 = document.createElement('summary');
sum2.textContent = 'Advanced options';
const content2 = document.createElement('div');
content2.textContent = 'These options are for power users only.\nProceed with caution.';
details2.appendChild(sum2);
details2.appendChild(content2);
details2.addEventListener('toggle', () => {
  status.textContent = `Advanced: ${details2.isOpen() ? 'expanded' : 'collapsed'}`;
});
s2.appendChild(details2);
app.appendChild(s2);

/* ── Disabled ──────────────────────────────────────────── */

const s3 = createSection(document, 'Disabled (cannot toggle)');
const details3 = document.createElement('details') as InstanceType<typeof Details>;
details3.setAttribute('disabled', '');
details3.setAttribute('open', '');
const sum3 = document.createElement('summary');
sum3.textContent = 'Locked section';
const content3 = document.createElement('div');
content3.textContent = 'This section is disabled and cannot be toggled.';
details3.appendChild(sum3);
details3.appendChild(content3);
s3.appendChild(details3);
app.appendChild(s3);

/* ── Nested details ────────────────────────────────────── */

const s4 = createSection(document, 'Nested');
const outer = document.createElement('details') as InstanceType<typeof Details>;
outer.setAttribute('tabindex', '0');
outer.setAttribute('open', '');
const sumOuter = document.createElement('summary');
sumOuter.textContent = 'Outer';
const inner = document.createElement('details') as InstanceType<typeof Details>;
inner.setAttribute('tabindex', '0');
const sumInner = document.createElement('summary');
sumInner.textContent = 'Inner (collapsed)';
const innerContent = document.createElement('div');
innerContent.textContent = 'Nested content here.';
inner.appendChild(sumInner);
inner.appendChild(innerContent);
outer.appendChild(sumOuter);
outer.appendChild(inner);
s4.appendChild(outer);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
