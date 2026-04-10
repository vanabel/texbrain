/**
 * Build-time: zip examples/bibtex-metapost-english-chinese → static/bundled-bibtex-example.zip
 * so production static hosts can load it same-origin (no CORS).
 */
import { zipSync } from 'fflate';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'examples/bibtex-metapost-english-chinese');
const outDir = join(root, 'static');
const outFile = join(outDir, 'bundled-bibtex-example.zip');

const files = {};

function walk(absDir, relBase) {
  for (const name of readdirSync(absDir)) {
    if (name === '.DS_Store') continue;
    const abs = join(absDir, name);
    const rel = relBase ? `${relBase}/${name}` : name;
    if (statSync(abs).isDirectory()) {
      walk(abs, rel);
    } else {
      const key = `examples/bibtex-metapost-english-chinese/${rel}`.replace(/\\/g, '/');
      files[key] = new Uint8Array(readFileSync(abs));
    }
  }
}

walk(srcDir, '');

mkdirSync(outDir, { recursive: true });
const zipped = zipSync(files, { level: 6 });
writeFileSync(outFile, zipped);
console.log(`bundled-bibtex-example: ${Object.keys(files).length} files → ${outFile}`);
