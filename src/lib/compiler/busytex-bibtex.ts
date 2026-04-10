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
  bbl?: { path: string; content: string };
}

export interface BusyTexStepLog {
  cmd: string;
  exitCode: number;
  log: string;
}

export interface BusyTexCompileCallbacks {
  onStepLog?: (step: BusyTexStepLog) => void;
  onBblReady?: (bbl: { path: string; content: string }) => void;
}

function readTextFromUnknown(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (value && typeof value === 'object') {
    const v = value as any;
    if (typeof v.content === 'string') return v.content;
    if (v.content instanceof Uint8Array) return new TextDecoder().decode(v.content);
    if (typeof v.data === 'string') return v.data;
    if (v.data instanceof Uint8Array) return new TextDecoder().decode(v.data);
  }
  return undefined;
}

function collectBusyTexArtifacts(result: any): Array<{ path: string; value: unknown }> {
  const out: Array<{ path: string; value: unknown }> = [];
  const direct = [result?.outputs, result?.files, result?.artifacts];
  for (const col of direct) {
    if (!col) continue;
    if (Array.isArray(col)) {
      for (const item of col) {
        const p = (item as any)?.path || (item as any)?.name;
        if (!p) continue;
        out.push({ path: String(p), value: (item as any)?.content ?? (item as any)?.data ?? item });
      }
      continue;
    }
    if (typeof col === 'object') {
      for (const [k, v] of Object.entries(col)) out.push({ path: String(k), value: v });
    }
  }
  return out;
}

function extractBusyTexBbl(result: any): { path: string; content: string } | undefined {
  const path = 'main.bbl';
  const directCandidates = [result?.bbl, result?.outputs?.[path], result?.files?.[path], result?.artifacts?.[path]];
  for (const c of directCandidates) {
    const text = readTextFromUnknown(c);
    if (text) return { path, content: text };
  }
  const artifacts = collectBusyTexArtifacts(result);
  for (const item of artifacts) {
    if (!item.path.toLowerCase().endsWith('.bbl')) continue;
    const text = readTextFromUnknown(item.value);
    if (text) return { path: item.path, content: text };
  }
  return undefined;
}

async function tryReadBblFromRunner(runner: any): Promise<{ path: string; content: string } | undefined> {
  const candidates = ['main.bbl', '/main.bbl', './main.bbl', 'texput.bbl', '/texput.bbl'];
  const dec = new TextDecoder();

  const toText = (v: any): string | undefined => {
    if (typeof v === 'string') return v;
    if (v instanceof Uint8Array) return dec.decode(v);
    if (v instanceof ArrayBuffer) return dec.decode(new Uint8Array(v));
    return undefined;
  };

  const tryValue = async (fn: (() => any) | undefined): Promise<string | undefined> => {
    if (!fn) return undefined;
    try {
      const out = await fn();
      return toText(out);
    } catch {
      return undefined;
    }
  };

  for (const p of candidates) {
    const readers: Array<(() => any) | undefined> = [
      runner?.readFile ? () => runner.readFile(p) : undefined,
      runner?.fs?.readFile ? () => runner.fs.readFile(p) : undefined,
      runner?.FS?.readFile ? () => runner.FS.readFile(p, { encoding: 'utf8' }) : undefined,
      runner?.Module?.FS?.readFile ? () => runner.Module.FS.readFile(p, { encoding: 'utf8' }) : undefined
    ];
    for (const read of readers) {
      const text = await tryValue(read);
      if (text) return { path: p.replace(/^\.?\//, ''), content: text };
    }
  }

  const fsLike = runner?.FS || runner?.Module?.FS || runner?.fs;
  const readdir = fsLike?.readdir?.bind(fsLike);
  const readFile = fsLike?.readFile?.bind(fsLike);
  if (!readdir || !readFile) return undefined;

  const seen = new Set<string>();
  const stack = ['/', '.'];
  const maxDirs = 200;
  let visitedDirs = 0;

  while (stack.length && visitedDirs < maxDirs) {
    const dir = stack.pop()!;
    if (seen.has(dir)) continue;
    seen.add(dir);
    visitedDirs++;

    let entries: string[];
    try {
      const out = readdir(dir);
      entries = Array.isArray(out) ? out.map((x: any) => String(x)) : [];
    } catch {
      continue;
    }

    for (const name of entries) {
      if (name === '.' || name === '..') continue;
      const full = dir === '/' ? `/${name}` : `${dir.replace(/\/+$/, '')}/${name}`;
      const lower = full.toLowerCase();

      if (lower.endsWith('.bbl')) {
        try {
          const content = toText(readFile(full));
          if (content) return { path: full.replace(/^\.?\//, ''), content };
        } catch {
          // ignore file read failure and continue scanning
        }
      }

      try {
        const childEntries = readdir(full);
        if (Array.isArray(childEntries)) stack.push(full);
      } catch {
        // not a directory
      }
    }
  }
  return undefined;
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
  bibtex = true,
  callbacks?: BusyTexCompileCallbacks
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
  const artifactList = collectBusyTexArtifacts(result as any).map(a => a.path);
  const resultKeys = result && typeof result === 'object' ? Object.keys(result as any) : [];
  const artifactNote = artifactList.length
    ? '\n\n[TeXbrain] BusyTeX artifacts:\n' + [...new Set(artifactList)].sort().join('\n')
    : '\n\n[TeXbrain] BusyTeX artifacts: (none reported)';
  const resultShapeNote = '\n\n[TeXbrain] BusyTeX result keys: ' + (resultKeys.length ? resultKeys.join(', ') : '(none)');
  const log =
    (result.log || '') +
    (result.logs?.length
      ? '\n\n--- steps ---\n' +
        result.logs.map(l => `[${l.cmd}] exit ${l.exit_code}\n${l.log || l.stdout || ''}`).join('\n')
      : '') +
    artifactNote +
    resultShapeNote;

  if (result.logs?.length) {
    for (const item of result.logs) {
      callbacks?.onStepLog?.({
        cmd: item.cmd || 'unknown',
        exitCode: item.exit_code ?? -1,
        log: item.log || item.stdout || ''
      });
    }
  }

  const bbl = extractBusyTexBbl(result as any) || (await tryReadBblFromRunner(runner));
  if (bbl?.content) {
    callbacks?.onBblReady?.(bbl);
  }
  return {
    pdf: result.pdf,
    status,
    log,
    usedBusyTex: true,
    bbl
  };
}
