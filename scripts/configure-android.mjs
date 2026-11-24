import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const manifestPath = resolve(root, 'android/app/src/main/AndroidManifest.xml');
const iconPath = resolve(root, 'android-assets/ic_launcher_cane.xml');
const drawableDirectory = resolve(root, 'android/app/src/main/res/drawable');
const manifest = await readFile(manifestPath, 'utf8');
const iconReference = /android:icon="@mipmap\/ic_launcher"/;

if (!iconReference.test(manifest)) {
  throw new Error('No se encontró el icono predeterminado de la aplicación Android.');
}

await mkdir(drawableDirectory, { recursive: true });
await copyFile(iconPath, resolve(drawableDirectory, 'ic_launcher_cane.xml'));
await writeFile(manifestPath, manifest.replace(iconReference, 'android:icon="@drawable/ic_launcher_cane"'));
