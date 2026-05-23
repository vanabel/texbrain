/**
 * Compile smoke tests for examples/.../Elegantbook-cn/
 * Uses local xelatex + bibtex when available (TeX Live / MacTeX).
 * Usage: node scripts/compile-elegantbook-cn-test.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const exampleDir = join(__dirname, '../examples/bibtex-metapost-english-chinese/Elegantbook-cn');

const ADOBE_OTF = [
  'AdobeSongStd-Light.otf',
  'AdobeHeitiStd-Regular.otf',
  'AdobeKaitiStd-Regular.otf',
  'AdobeFangsongStd-Regular.otf'
];

function adobeFontsPresent() {
  for (const f of ADOBE_OTF) {
    if (existsSync(join(exampleDir, f))) return true;
    if (existsSync(join(exampleDir, 'fonts', f))) return true;
  }
  return false;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: exampleDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status ?? 1;
}

function compileCase(label, main, withBib) {
  console.log(`\n=== ${label} (${main}) ===`);
  const base = main.replace(/\.tex$/i, '');
  let status = run('xelatex', ['-interaction=nonstopmode', main]);
  if (status !== 0) throw new Error(`${label}: first xelatex failed`);
  if (withBib) {
    status = run('bibtex', [base]);
    if (status !== 0) throw new Error(`${label}: bibtex failed`);
  }
  status = run('xelatex', ['-interaction=nonstopmode', main]);
  if (status !== 0) throw new Error(`${label}: second xelatex failed`);
  status = run('xelatex', ['-interaction=nonstopmode', main]);
  if (status !== 0) throw new Error(`${label}: third xelatex failed`);
  const pdf = join(exampleDir, `${base}.pdf`);
  if (!existsSync(pdf)) throw new Error(`${label}: missing ${pdf}`);
  console.log(`  OK — ${pdf}`);
}

function main() {
  if (spawnSync('xelatex', ['--version'], { encoding: 'utf8' }).status !== 0) {
    console.error('xelatex not found. Install TeX Live / MacTeX to run this test.');
    process.exit(1);
  }

  compileCase('elegantbook-cn-test (Fandol)', 'elegantbook-cn-test.tex', false);

  if (adobeFontsPresent()) {
    compileCase('elegantbook-cn-adobe', 'elegantbook-cn-adobe.tex', true);
  } else {
    console.log('\n=== elegantbook-cn-adobe (skipped) ===');
    console.log('  Adobe OTF not found. Run: cd Elegantbook-cn && ./setup-fonts.sh');
  }
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
