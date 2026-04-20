import { base } from '$app/paths';
import { projectUsesBiblatexBibliography } from './biblatex-detect';

/** 仅在这些扩展名里判断 biber / biblatex 载入方式，避免 .cbx/.bbx/.bib/.ipynb 等里的说明文字触发误判。 */
const RE_BIB_ENGINE_NARROW_PATH = /\.(tex|cls|sty|clo|cfg|ltx)$/i;

function joinNarrowForBibEngine(files: Map<string, string>): string {
  const chunks: string[] = [];
  for (const [path, content] of files) {
    if (RE_BIB_ENGINE_NARROW_PATH.test(path)) chunks.push(content);
  }
  return chunks.join('\n');
}

/** BusyTeX WASM 静态资源根路径（由 `pnpm run download-busytex` 下载到 static/busytex/） */
export const BUSYTEX_BASE_PATH = `${base}/busytex`;
export type CompileEngine = 'pdflatex' | 'xelatex';

let runnerPromise: Promise<import('texlyre-busytex').BusyTexRunner> | null = null;

/** 识别载入 biblatex（可选参数可跨多行；`\RequirePackage%` 换行后再 `[` 也允许）。 */
function loadsBiblatexPackage(all: string): boolean {
  const pkg = String.raw`(?:usepackage|RequirePackage)`;
  const pct = String.raw`(?:\s*%\s*[^\n]*)?`;
  // 可选参数：非贪婪到首个 ]；与 {biblatex} 之间的 % 断行
  return new RegExp(
    String.raw`\\${pkg}${pct}\s*(?:\[[\s\S]*?\])?${pct}\s*\{\s*biblatex\s*\}`,
    'm'
  ).test(all);
}

function hasBiblatexBiberBackend(all: string): boolean {
  return (
    /backend\s*=\s*biber/.test(all) ||
    /\\PassOptionsToPackage\s*\{\s*backend\s*=\s*biber\s*\}\s*\{\s*biblatex\s*\}/.test(all)
  );
}

/**
 * 判断项目是否需要真正的 BibTeX（bibtex8）流程（与 SwiftLaTeX 仅多次 pdfTeX 不同）。
 * - 经典 `\\bibliography` / `\\bibliographystyle`：需要。
 * - biblatex：BusyTeX / SwiftLaTeX WASM **不能跑 biber**，可执行的后端只有 bibtex8。因此在
 *   `.tex` / `.cls` / `.sty` / `.clo` / `.cfg` / `.ltx` 中**未**显式写 `backend=biber` 时，只要识别到
 *   biblatex（`\\usepackage/\\RequirePackage`、或 `\\addbibresource` / `\\printbibliography`、或字面 `{biblatex}`），
 *   即视为需要 bibtex8。这样类文件里用宏展开 `backend=\\foo` 而非常量 `backend=bibtex` 的模板也能触发 BibTeX。
 * - 仅在上述窄源码里出现 `backend=biber`（或等价的 `\\PassOptionsToPackage`）时视为 biber 工程，不跑 bibtex8。
 */
export function projectNeedsBibtexEngine(files: Map<string, string>): boolean {
  const narrow = joinNarrowForBibEngine(files);
  const all = [...files.values()].join('\n');

  if (/\\bibliography\{/.test(all)) return true;
  if (/\\bibliographystyle\{/.test(all)) return true;

  if (hasBiblatexBiberBackend(narrow)) return false;

  return (
    loadsBiblatexPackage(narrow) ||
    projectUsesBiblatexBibliography(narrow) ||
    /\{\s*biblatex\s*\}/.test(narrow)
  );
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

function withBusyTexMarker(source: string): string {
  // Inject a stable marker macro for template-level compatibility guards.
  // \providecommand avoids overriding user-defined \BUSYTEX.
  return `\\providecommand\\BUSYTEX{}\n${source}`;
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
      input: withBusyTexMarker(mainContent),
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

  const bbl = extractBusyTexBbl(result as any) || (await tryReadBblFromRunner(runner));
  return {
    pdf: result.pdf,
    status,
    log,
    usedBusyTex: true,
    bbl
  };
}
