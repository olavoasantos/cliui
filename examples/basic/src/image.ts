import {Img} from '@cliui/elements';
import {createDemo, createShell, createSection, createStatus} from './_helpers.ts';

import {resolve} from 'node:path';

const {terminal, document, window} = createDemo();
window.customElements.define(Img.tagName, Img);

const app = createShell(
  document,
  'img',
  'Displays images via Kitty/iTerm2 graphics protocols. Falls back to alt text. Ctrl+Q quit.',
);

const status = createStatus(document, 'Status: idle');

/* ── Inline image ──────────────────────────────────────── */

const s1 = createSection(document, 'Inline image');
const img = document.createElement('img') as Img;
img.setAttribute('src', resolve(import.meta.dirname, 'test-image.png'));
img.setAttribute('alt', 'Purple test image');
img.setAttribute('width', '20');
img.setAttribute('height', '6');
s1.appendChild(img);

const info = document.createElement('div');
info.className = 'hint';
info.textContent = `naturalWidth=${img.naturalWidth} naturalHeight=${img.naturalHeight}`;
s1.appendChild(info);
app.appendChild(s1);

/* ── Fallback (missing file) ───────────────────────────── */

const s2 = createSection(document, 'Missing image (fallback)');
const missing = document.createElement('img') as Img;
missing.setAttribute('src', '/does/not/exist.png');
missing.setAttribute('alt', 'Image not found');
missing.setAttribute('width', '20');
missing.setAttribute('height', '3');
s2.appendChild(missing);
app.appendChild(s2);

/* ── Alt text only ─────────────────────────────────────── */

const s3 = createSection(document, 'No src (alt text only)');
const noSrc = document.createElement('img') as Img;
noSrc.setAttribute('alt', 'Decorative placeholder');
noSrc.setAttribute('width', '25');
noSrc.setAttribute('height', '2');
s3.appendChild(noSrc);
app.appendChild(s3);

/* ── Properties ────────────────────────────────────────── */

const s4 = createSection(document, 'DOM properties');
const propImg = document.createElement('img') as Img;
propImg.src = resolve(import.meta.dirname, 'test-image.png');
propImg.alt = 'Property access demo';
propImg.width = 15;
propImg.height = 4;
document.body.appendChild(propImg); // trigger connectedCallback to load

const propInfo = document.createElement('div');
propInfo.className = 'hint';
propInfo.textContent = [
  `src="${propImg.src}"`,
  `alt="${propImg.alt}"`,
  `width=${propImg.width}`,
  `height=${propImg.height}`,
  `naturalWidth=${propImg.naturalWidth}`,
  `naturalHeight=${propImg.naturalHeight}`,
  `loaded=${propImg.imageData !== null}`,
].join('  ');
document.body.removeChild(propImg); // clean up, re-add below

s4.appendChild(propImg);
s4.appendChild(propInfo);
app.appendChild(s4);

app.appendChild(status);
document.body.appendChild(app);
await terminal.run();
