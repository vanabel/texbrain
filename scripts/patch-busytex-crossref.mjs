/**
 * BusyTeX upstream pipeline runs only one LaTeX pass when bibtex=false.
 * Cross-references (\ref, \cref, TOC, etc.) need at least two passes.
 * Re-apply after every `download-busytex` (assets tarball overwrites busytex_pipeline.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pipelinePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'static',
  'busytex',
  'busytex_pipeline.js'
);

const XETEX_OLD = `                [
                    [xetex, this.error_messages_all, false],
                    [xdvipdfmx, this.error_messages_all, false]
                ];`;

const XETEX_NEW = `                [
                    [xetex, this.error_messages_fatal, false],
                    [xetex, this.error_messages_all, true],
                    [xdvipdfmx, this.error_messages_all, false]
                ];`;

const PDFTEX_OLD = `                [
                    [pdftex, this.error_messages_all]
                ];`;

const PDFTEX_NEW = `                [
                    [pdftex_not_final, this.error_messages_fatal, false],
                    [pdftex, this.error_messages_all, false]
                ];`;

function patch() {
  if (!fs.existsSync(pipelinePath)) {
    console.warn('[patch-busytex-crossref] skip: missing', pipelinePath);
    return false;
  }
  let src = fs.readFileSync(pipelinePath, 'utf8');
  let changed = false;

  if (src.includes(XETEX_OLD)) {
    src = src.replace(XETEX_OLD, XETEX_NEW);
    changed = true;
    console.log('[patch-busytex-crossref] xelatex: enabled 2-pass chain for cross-references');
  } else if (src.includes(XETEX_NEW)) {
    console.log('[patch-busytex-crossref] xelatex: already patched');
  } else {
    console.warn('[patch-busytex-crossref] xelatex: pattern not found — upstream may have changed');
  }

  if (src.includes(PDFTEX_OLD)) {
    src = src.replace(PDFTEX_OLD, PDFTEX_NEW);
    changed = true;
    console.log('[patch-busytex-crossref] pdflatex: enabled 2-pass chain for cross-references');
  } else if (src.includes(PDFTEX_NEW)) {
    console.log('[patch-busytex-crossref] pdflatex: already patched');
  } else {
    console.warn('[patch-busytex-crossref] pdflatex: pattern not found — upstream may have changed');
  }

  if (changed) fs.writeFileSync(pipelinePath, src);
  return changed;
}

patch();
