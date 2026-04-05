import {Terminal} from '@cliui/terminal';
import css from './styles.css?inline';

const terminal = new Terminal({
  altScreen: true,
  fps: 30,
  output: process.stdout,
  input: process.stdin,
});

const doc = terminal.document;

// ── Stylesheet ──────────────────────────────────────────────
const style = doc.createElement('style');
style.textContent = css;
doc.head.appendChild(style);

// ── App shell ───────────────────────────────────────────────
const app = doc.createElement('div');
app.className = 'app';

// Header
const header = doc.createElement('div');
header.className = 'header';

const title = doc.createElement('div');
title.className = 'title';
title.textContent = '📊 Media & Container Queries Demo';

const status = doc.createElement('div');
status.className = 'status';

header.appendChild(title);
header.appendChild(status);
app.appendChild(header);

// Dashboard
const dashboard = doc.createElement('div');
dashboard.className = 'dashboard';

// Sidebar
const sidebar = doc.createElement('div');
sidebar.className = 'sidebar';

const sidebarTitle = doc.createElement('div');
sidebarTitle.className = 'sidebar-title';
sidebarTitle.textContent = 'Navigation';

sidebar.appendChild(sidebarTitle);

const navItems = ['Dashboard', 'Reports', 'Settings', 'Help'];
for (const label of navItems) {
  const item = doc.createElement('div');
  item.className = 'nav-item';
  item.textContent = `→ ${label}`;
  sidebar.appendChild(item);
}

dashboard.appendChild(sidebar);

// Main content
const main = doc.createElement('div');
main.className = 'main';

const mainTitle = doc.createElement('div');
mainTitle.className = 'main-title';
mainTitle.textContent = 'Content Area';

main.appendChild(mainTitle);

// Cards
const cards = [
  {title: 'Server Status', detail: 'All systems operational. 99.9% uptime.'},
  {title: 'Active Users', detail: '1,247 users online. Peak: 3,891 today.'},
  {title: 'Disk Usage', detail: '67% used. 128 GB free of 384 GB total.'},
];

for (const cardData of cards) {
  const card = doc.createElement('div');
  card.className = 'card';

  const cardTitle = doc.createElement('div');
  cardTitle.className = 'card-title';
  cardTitle.textContent = cardData.title;

  const cardDetail = doc.createElement('div');
  cardDetail.className = 'card-detail';
  cardDetail.textContent = cardData.detail;

  card.appendChild(cardTitle);
  card.appendChild(cardDetail);
  main.appendChild(card);
}

dashboard.appendChild(main);
app.appendChild(dashboard);

// Footer
const footer = doc.createElement('div');
footer.className = 'footer';
footer.textContent = 'Resize your terminal to see responsive layout changes!';
app.appendChild(footer);

doc.body.appendChild(app);

// ── Update status bar with current dimensions ───────────────
function updateStatus(): void {
  const cols = process.stdout.columns ?? 80;
  const rows = process.stdout.rows ?? 24;
  const orientation = cols > rows ? 'landscape' : 'portrait';
  status.textContent = `${cols}×${rows} ${orientation}`;
}

updateStatus();

terminal.window.addEventListener('resize', () => {
  updateStatus();
});

// ── Input handling ──────────────────────────────────────────
doc.body.addEventListener('keydown', (e: Event) => {
  const ke = e as unknown as {key: string};
  if (ke.key === 'q' || ke.key === 'Escape') {
    terminal.exit();
  }
});

await terminal.run();
