import { base } from '$app/paths';

/** BusyTeX WASM 静态资源根路径（由 `pnpm run download-busytex` 下载到 static/busytex/） */
export const BUSYTEX_BASE_PATH = `${base}/busytex`;
export type CompileEngine = 'pdflatex' | 'xelatex';

let runnerPromise: Promise<import('texlyre-busytex').BusyTexRunner> | null = null;

/**
 * 判断项目是否需要真正的 BibTeX（bibtex8）流程（与 SwiftLaTeX 仅多次 pdfTeX 不同）。
 * - 经典 `\\bibliography` / `\\bibliographystyle`：需要。
 * - `biblatex` 且 `backend=bibtex`：需要。
 * - 默认 `biblatex`（通常为 biber）或显式 `backend=biber`：不适用 BusyTeX。
 */
export function projectNeedsBibtexEngine(files: Map<string, string>): boolean {
  const all = [...files.values()].join('\n');
  const usesBiblatex = /\\usepackage(?:\[[^\]]*\])?\{biblatex\}/.test(all);
  if (usesBiblatex) {
    if (/backend\s*=\s*biber/.test(all)) return false;
    if (/backend\s*=\s*bibtex8?/.test(all)) return true;
    return false;
  }
  if (/\\bibliography\{/.test(all)) return true;
  if (/\\bibliographystyle\{/.test(all)) return true;
  return false;
}

let assetsCheckCache: boolean | null = null;

export async function busytexAssetsAvailable(): Promise<boolean> {
  if (assetsCheckCache !== null) return assetsCheckCache;
  if (typeof fetch === 'undefined') {
    assetsCheckCache = false;
    return false;
  }
  try {
    const url = `${BUSYTEX_BASE_PATH}/busytex.js`;
    const r = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
    assetsCheckCache = r.ok;
    return assetsCheckCache;
  } catch {
    assetsCheckCache = false;
    return false;
  }
}

async function getBusyTexRunner(): Promise<import('texlyre-busytex').BusyTexRunner> {
  if (!runnerPromise) {
    runnerPromise = (async () => {
      const { BusyTexRunner } = await import('texlyre-busytex');
      const runner = new BusyTexRunner({
        busytexBasePath: BUSYTEX_BASE_PATH,
        verbose: false
      });
      await runner.initialize(true);
      return runner;
    })();
  }
  return runnerPromise;
}

/** 初始化失败时清除缓存，便于下载资源后重试 */
export function resetBusyTexRunner(): void {
  runnerPromise = null;
}

export interface BusyTexCompileOutcome {
  pdf: Uint8Array | undefined;
  status: number;
  log: string;
  usedBusyTex: boolean;
}

/**
 * 使用 texlyre-busytex 的 PdfLaTeX + bibtex8 编译（多轮 pdflatex/bibtex）。
 * 主稿在 BusyTeX 虚拟文件系统中固定为 `main.tex`，内容由入口文件内容提供。
 */
export async function compileWithBusyTexBibtex(
  mainFile: string,
  files: Map<string, string>,
  binaryFiles?: Map<string, ArrayBuffer>,
  engine: CompileEngine = 'pdflatex',
  bibtex = true
): Promise<BusyTexCompileOutcome> {
  const mainContent = files.get(mainFile);
  if (mainContent === undefined) {
    return {
      pdf: undefined,
      status: 1,
      log: `BusyTeX: main file not in project: ${mainFile}`,
      usedBusyTex: false
    };
  }

  let runner: import('texlyre-busytex').BusyTexRunner;
  try {
    runner = await getBusyTexRunner();
  } catch (e) {
    resetBusyTexRunner();
    const msg = e instanceof Error ? e.message : String(e);
    return {
      pdf: undefined,
      status: 1,
      log:
        `BusyTeX initialization failed: ${msg}\n` +
        `Download WASM assets with: pnpm run download-busytex`,
      usedBusyTex: false
    };
  }

  const { PdfLatex, XeLatex } = await import('texlyre-busytex');

  const additionalFiles: import('texlyre-busytex').FileInput[] = [];
  for (const [path, content] of files) {
    // BusyTeX compiles the provided `input` as virtual `main.tex`.
    // Never allow project files to overwrite this reserved entry.
    if (path === mainFile || path === 'main.tex') continue;
    additionalFiles.push({ path, content });
  }
  if (binaryFiles) {
    for (const [path, buf] of binaryFiles) {
      if (path === mainFile || path === 'main.tex' || files.has(path)) continue;
      additionalFiles.push({ path, content: new Uint8Array(buf) });
    }
  }

  const compiler = engine === 'xelatex' ? new XeLatex(runner) : new PdfLatex(runner);
  let result: import('texlyre-busytex').CompileResult;
  try {
    result = await compiler.compile({
      input: mainContent,
      bibtex,
      additionalFiles,
      verbose: 'silent'
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      pdf: undefined,
      status: 1,
      log: `BusyTeX compile error: ${msg}`,
      usedBusyTex: true
    };
  }

  const status = result.exitCode;
  const log =
    (result.log || '') +
    (result.logs?.length
      ? '\n\n--- steps ---\n' +
        result.logs.map(l => `[${l.cmd}] exit ${l.exit_code}\n${l.log || l.stdout || ''}`).join('\n')
      : '');

  return {
    pdf: result.pdf,
    status,
    log,
    usedBusyTex: true
  };
}
