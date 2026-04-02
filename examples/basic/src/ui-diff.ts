import {UiDiff} from '@cliui/elements';
import {createDemo, createShell, createSection} from './_helpers.ts';

const {terminal, document, window} = createDemo();
window.customElements.define(UiDiff.tagName, UiDiff);

const app = createShell(
  document,
  'ui-diff',
  'Unified diff viewer with color-coded additions/deletions.',
);

/* ── Simple diff ───────────────────────────────────────── */

const s1 = createSection(document, 'Simple change');
const diff1 = document.createElement('ui-diff') as InstanceType<typeof UiDiff>;
diff1.textContent = `--- a/config.ts
+++ b/config.ts
@@ -1,5 +1,5 @@
 export const config = {
-  debug: false,
-  logLevel: 'warn',
+  debug: true,
+  logLevel: 'verbose',
   port: 3000,
 };`;
s1.appendChild(diff1);
app.appendChild(s1);

/* ── Addition only ─────────────────────────────────────── */

const s2 = createSection(document, 'Additions only');
const diff2 = document.createElement('ui-diff') as InstanceType<typeof UiDiff>;
diff2.textContent = `@@ -3,0 +4,3 @@
 existing line
+new feature flag
+another new line
+third addition`;
s2.appendChild(diff2);
app.appendChild(s2);

/* ── Removal only ──────────────────────────────────────── */

const s3 = createSection(document, 'Removals only');
const diff3 = document.createElement('ui-diff') as InstanceType<typeof UiDiff>;
diff3.textContent = `@@ -1,5 +1,2 @@
 keep this
-remove this
-and this
-also this
 keep this too`;
s3.appendChild(diff3);
app.appendChild(s3);

document.body.appendChild(app);
await terminal.run();
