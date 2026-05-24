/**
 * BusyTeX upstream pipeline runs only one LaTeX pass when bibtex=false.
 * Cross-references (\ref, \cref, TOC, etc.) need at least two passes.
 * Re-apply after every `download-busytex` (assets tarball overwrites busytex_pipeline.js).
 *
 * Also: do not skip post-bibtex LaTeX when bibtex8 writes an empty .bbl, and rerun LaTeX
 * (up to two extra passes) when .log still reports undefined citations/references.
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

/** Empty .bbl must not skip cross-ref passes after bibtex8. */
const BIBTEX_XETEX_SKIP_OLD = `                    [bibtex8, this.error_messages_fatal, true],
                    [xetex, this.error_messages_fatal, true],
                    [xetex, this.error_messages_all, true],
                    [xdvipdfmx, this.error_messages_all, false]`;

const BIBTEX_XETEX_SKIP_NEW = `                    [bibtex8, this.error_messages_fatal, true],
                    [xetex, this.error_messages_fatal, false],
                    [xetex, this.error_messages_all, false],
                    [xdvipdfmx, this.error_messages_all, false]`;

const BIBTEX_PDFTEX_SKIP_OLD = `                    [bibtex8, this.error_messages_fatal, true],
                    [pdftex_not_final, this.error_messages_fatal, true],
                    [pdftex, this.error_messages_all, false]`;

const BIBTEX_PDFTEX_SKIP_NEW = `                    [bibtex8, this.error_messages_fatal, true],
                    [pdftex_not_final, this.error_messages_fatal, false],
                    [pdftex, this.error_messages_all, false]`;

const UNRESOLVED_RERUN_OLD = `            if (exit_code != 0)
                break;
        }

        console.log('LOGS', logs);`;

const UNRESOLVED_RERUN_NEW = `            if (exit_code != 0)
                break;
        }

        const runPipelineCmd = (cmd, error_messages, is_bibtex) => {
            const cmd_log_path = is_bibtex ? blg_path : log_path;
            const cmd_aux_path = is_bibtex ? bbl_path : aux_path;
            this.remove(FS, this.texmflog);
            this.remove(FS, this.missfontlog);
            this.remove(FS, cmd_log_path);
            this.print('$ busytex ' + cmd.join(' '));
            const step = Module.callMainWithRedirects([...cmd], verbose != BusytexPipeline.VerboseSilent);
            Module.HEAPU8.fill(0);
            Module.HEAPU8.set(mem_header);
            this.print('$ echo $?');
            this.print(step.exit_code + '\\n');
            aux = this.read_all_text(FS, cmd_aux_path);
            log = this.read_all_text(FS, cmd_log_path);
            exit_code = step.stdout.trim()
                ? (error_messages.some(err => step.stdout.includes(err)) ? step.exit_code : 0)
                : step.exit_code;
            logs.push({
                cmd: cmd.join(' '),
                texmflog: '',
                missfontlog: '',
                log: log.trim(),
                aux: aux.trim(),
                stdout: step.stdout.trim(),
                stderr: step.stderr.trim(),
                exit_code: exit_code
            });
            return exit_code;
        };

        const logHasUnresolvedRefs = (logText) => logText && (
            /LaTeX Warning: Citation '/.test(logText)
            || /LaTeX Warning: Reference '/.test(logText)
            || /There were undefined references/.test(logText)
            || /There were undefined citations/.test(logText)
        );

        if (exit_code === 0 && driver === 'xetex_bibtex8_dvipdfmx') {
            let extraPass = 0;
            while (extraPass < 2 && logHasUnresolvedRefs(log)) {
                extraPass++;
                this.print('$ # extra XeLaTeX pass ' + extraPass + '/2 (unresolved citations/references in .log)');
                if (runPipelineCmd(xetex, this.error_messages_all, false) !== 0) break;
                this.print('$ # rebuild PDF after extra XeLaTeX');
                if (runPipelineCmd(xdvipdfmx, this.error_messages_all, false) !== 0) break;
            }
        } else if (exit_code === 0 && driver === 'pdftex_bibtex8') {
            let extraPass = 0;
            while (extraPass < 2 && logHasUnresolvedRefs(log)) {
                extraPass++;
                this.print('$ # extra pdfLaTeX pass ' + extraPass + '/2 (unresolved citations/references in .log)');
                if (runPipelineCmd(pdftex_not_final, this.error_messages_fatal, false) !== 0) break;
                if (runPipelineCmd(pdftex, this.error_messages_all, false) !== 0) break;
            }
        }

        console.log('LOGS', logs);`;

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
      ],
      [
        BIBTEX_XETEX_SKIP_OLD,
        BIBTEX_XETEX_SKIP_NEW,
        'always run post-bibtex XeLaTeX passes',
        'post-bibtex XeLaTeX skip already patched',
        'post-bibtex XeLaTeX skip pattern not found'
      ],
      [
        BIBTEX_PDFTEX_SKIP_OLD,
        BIBTEX_PDFTEX_SKIP_NEW,
        'always run post-bibtex pdfLaTeX passes',
        'post-bibtex pdfLaTeX skip already patched',
        'post-bibtex pdfLaTeX skip pattern not found'
      ],
      [
        UNRESOLVED_RERUN_OLD,
        UNRESOLVED_RERUN_NEW,
        'rerun LaTeX when .log has undefined cites/refs',
        'unresolved cite/ref rerun already patched',
        'unresolved cite/ref rerun pattern not found'
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
