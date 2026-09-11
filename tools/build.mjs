// Copies the playable game into dist/ — the folder both Capacitor and Tauri
// package. There is no bundler: the shells serve dist/ over a local scheme, so
// plain ES modules load exactly as they do from the dev server.
import { cp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const ASSETS = ['index.html', 'style.css', 'src'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const asset of ASSETS) {
  await cp(join(root, asset), join(dist, asset), { recursive: true });
}

// Stamp the build so the title screen can show something meaningful.
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const html = await readFile(join(dist, 'index.html'), 'utf8');
await writeFile(
  join(dist, 'index.html'),
  html.replace('EARLY WORLD · v0.6', `EARLY WORLD · v${pkg.version}`),
);

console.log(`dist/ built — ${ASSETS.join(', ')} (v${pkg.version})`);
