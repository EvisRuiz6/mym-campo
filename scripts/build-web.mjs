import { mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'www');
const files = [
  'index.html',
  'app.css',
  'app.js',
  'config.js',
  'excel-export.js',
  'manifest.json',
  'service-worker.js',
  'icon.svg',
  'vendor/exceljs-4.4.0.min.js'
];

for (const file of files) {
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, file), destination);
}

console.log(`MyM Campo preparado para Android en ${output}`);
