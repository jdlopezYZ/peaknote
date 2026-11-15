// Regenera la lista PRECACHE de sw.js con todos los archivos de la app.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = ['index.html', 'manifest.webmanifest', ...walk(join(root, 'src')), ...walk(join(root, 'assets'))]
  .map((f) => (f.startsWith(root) ? relative(root, f) : f).split(sep).join('/'))
  .sort();
const list = ['./', ...files.map((f) => `./${f}`)];
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const out = sw.replace(/\/\/ <PRECACHE>[\s\S]*?\/\/ <\/PRECACHE>/, `// <PRECACHE>\nconst PRECACHE = ${JSON.stringify(list, null, 2)};\n// </PRECACHE>`);
writeFileSync(join(root, 'sw.js'), out);
console.log(`sw.js: ${list.length} archivos en precaché`);
