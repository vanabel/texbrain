/**
 * BusyTeX upstream pipeline runs only one LaTeX pass when bibtex=false.
 * Cross-references (\ref, \cref, TOC, etc.) need at least two passes.
 * Re-apply after every `download-busytex` (assets tarball overwrites busytex_pipeline.js).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const busytexDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'static', 'busytex');
const pipelinePath = path.join(busytexDir, 'busytex_pipeline.js');
const workerPath = path.join(busytexDir, 'busytex_worker.js');

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

/** Upstream fallback only enables resolver catalog (basic); drops preloaded texlive-extra (ctex, etc.). */
const UNRESOLVED_PKGS_OLD = `            data_packages_js = this.data_package_resolver.data_packages_js;
            this.print('Because of unresolved TeX packages, enabling all available data packages: ' + data_packages_js.sort().toString());`;

const UNRESOLVED_PKGS_NEW = `            data_packages_js = [...new Set([...this.data_package_resolver.data_packages_js, ...this.preload_data_packages_js])];
            this.print('Because of unresolved TeX packages, enabling all available data packages: ' + data_packages_js.sort().toString());`;

const WORKER_INIT_OLD = `            self.pipeline = new BusytexPipeline(busytex_js, busytex_wasm, data_packages_js, preload_data_packages_js, texmf_local, msg => postMessage({print : msg}), applet_versions => postMessage({ initialized : applet_versions }), preload, BusytexPipeline.ScriptLoaderWorker);`;

const WORKER_INIT_NEW = `            const catalog_js = [...new Set([...(data_packages_js || []), ...(preload_data_packages_js || [])])];
            self.pipeline = new BusytexPipeline(busytex_js, busytex_wasm, catalog_js, preload_data_packages_js, texmf_local, msg => postMessage({print : msg}), applet_versions => postMessage({ initialized : applet_versions }), preload, BusytexPipeline.ScriptLoaderWorker);`;

function applyReplacements(src, pairs, label) {
  let changed = false;
  for (const [oldText, newText, okMsg, skipMsg, warnMsg] of pairs) {
    if (src.includes(newText)) {
      console.log(`[patch-busytex-crossref] ${label}: ${skipMsg}`);
    } else if (src.includes(oldText)) {
      src = src.replace(oldText, newText);
      changed = true;
      console.log(`[patch-busytex-crossref] ${label}: ${okMsg}`);
    } else {
      console.warn(`[patch-busytex-crossref] ${label}: ${warnMsg}`);
    }
  }
  return { src, changed };
}

function patchPipeline() {
  if (!fs.existsSync(pipelinePath)) {
    console.warn('[patch-busytex-crossref] skip pipeline: missing', pipelinePath);
    return false;
  }
  let src = fs.readFileSync(pipelinePath, 'utf8');
  const { src: next, changed } = applyReplacements(
    src,
    [
      [XETEX_OLD, XETEX_NEW, 'enabled 2-pass chain for cross-references', 'xelatex already patched', 'xelatex pattern not found'],
      [PDFTEX_OLD, PDFTEX_NEW, 'enabled 2-pass chain for cross-references', 'pdflatex already patched', 'pdflatex pattern not found'],
      [
        UNRESOLVED_PKGS_OLD,
        UNRESOLVED_PKGS_NEW,
        'keep texlive-extra on unresolved-package fallback',
        'data packages already patched',
        'data packages pattern not found'
      ]
    ],
    'pipeline'
  );
  if (changed) fs.writeFileSync(pipelinePath, next);
  return changed;
}

function patchWorker() {
  if (!fs.existsSync(workerPath)) {
    console.warn('[patch-busytex-crossref] skip worker: missing', workerPath);
    return false;
  }
  let src = fs.readFileSync(workerPath, 'utf8');
  const { src: next, changed } = applyReplacements(
    src,
    [
      [
        WORKER_INIT_OLD,
        WORKER_INIT_NEW,
        'merge preload into data-package catalog',
        'worker already patched',
        'worker pattern not found'
      ]
    ],
    'worker'
  );
  if (changed) fs.writeFileSync(workerPath, next);
  return changed;
}

patchPipeline();
patchWorker();
