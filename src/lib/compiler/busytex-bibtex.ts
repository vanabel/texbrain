import { base } from '$app/paths';
import type { LogEntry } from '@vanabel/texlyre-busytex';
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
const BUSYTEX_TEXLIVE_BASIC = `${BUSYTEX_BASE_PATH}/texlive-basic.js`;
const BUSYTEX_TEXLIVE_EXTRA = `${BUSYTEX_BASE_PATH}/texlive-extra.js`;

let runnerPromise: Promise<import('@vanabel/texlyre-busytex').BusyTexRunner> | null = null;

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
    const head = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
    if (head.ok) {
      assetsCheckCache = true;
      return true;
    }
    // Some CDNs/proxies reject HEAD on static assets; fallback to GET probe.
    const get = await fetch(url, { method: 'GET', cache: 'force-cache' });
    assetsCheckCache = get.ok;
    return get.ok;
  } catch {
    assetsCheckCache = false;
    return false;
  }
}

async function getBusyTexRunner(): Promise<import('@vanabel/texlyre-busytex').BusyTexRunner> {
  if (!runnerPromise) {
    runnerPromise = (async () => {
      const { BusyTexRunner } = await import('@vanabel/texlyre-busytex');
      const runner = new BusyTexRunner({
        busytexBasePath: BUSYTEX_BASE_PATH,
        verbose: false,
        // Compatibility with newer BusyTeX runners: provide data package lists explicitly.
        // Older versions ignore unknown fields, so this is safe across 0.1.x / 1.x lines.
        preloadDataPackages: [BUSYTEX_TEXLIVE_BASIC, BUSYTEX_TEXLIVE_EXTRA],
        catalogDataPackages: [BUSYTEX_TEXLIVE_BASIC]
      } as any);
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

/** 当前引擎与工程是否会走 BusyTeX（XeLaTeX 固定走；pdfLaTeX 仅在需要 BibTeX 流水线且资源存在时走）。 */
export function needsBusyTexForProject(engine: CompileEngine, files: Map<string, string>): boolean {
  if (engine === 'xelatex') return true;
  return engine === 'pdflatex' && projectNeedsBibtexEngine(files);
}

/**
 * 预初始化 BusyTeX Worker（与编译共用单例）。失败时重置 runner，便于后续编译重试。
 * 可在首屏或编译前调用；无资源或不需要 BusyTeX 时为 no-op。
 */
export async function warmupBusyTexForProject(
  engine: CompileEngine,
  files: Map<string, string>
): Promise<void> {
  if (!needsBusyTexForProject(engine, files)) return;
  if (!(await busytexAssetsAvailable())) return;
  try {
    await getBusyTexRunner();
  } catch {
    resetBusyTexRunner();
  }
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
  const dec = new TextDecoder();
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return dec.decode(value);
  if (value instanceof ArrayBuffer) return dec.decode(new Uint8Array(value));
  if (value && typeof value === 'object') {
    const v = value as any;
    if (typeof v.content === 'string') return v.content;
    if (v.content instanceof Uint8Array) return dec.decode(v.content);
    if (v.content instanceof ArrayBuffer) return dec.decode(new Uint8Array(v.content));
    if (typeof v.data === 'string') return v.data;
    if (v.data instanceof Uint8Array) return dec.decode(v.data);
    if (v.data instanceof ArrayBuffer) return dec.decode(new Uint8Array(v.data));
    if (typeof v.text === 'string') return v.text;
    if (typeof v.value === 'string') return v.value;
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

function artifactByteSize(value: unknown): number | undefined {
  if (value instanceof Uint8Array) return value.byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (typeof value === 'string') return new TextEncoder().encode(value).length;
  if (value && typeof value === 'object') {
    const v = value as any;
    if (v.content instanceof Uint8Array) return v.content.byteLength;
    if (v.content instanceof ArrayBuffer) return v.content.byteLength;
    if (typeof v.content === 'string') return new TextEncoder().encode(v.content).length;
    if (v.data instanceof Uint8Array) return v.data.byteLength;
    if (v.data instanceof ArrayBuffer) return v.data.byteLength;
  }
  return undefined;
}

async function synctexPathsFromBusyTexRunner(runner: any): Promise<string[]> {
  if (typeof runner?.readProjectFiles !== 'function') return [];
  try {
    const projectFiles = await runner.readProjectFiles('.');
    if (!Array.isArray(projectFiles)) return [];
    const out: string[] = [];
    for (const f of projectFiles) {
      const p = String((f as any)?.path || (f as any)?.name || '');
      if (p && p.toLowerCase().includes('synctex')) out.push(p);
    }
    return [...new Set(out)].sort();
  } catch {
    return [];
  }
}

/** Log-only: list SyncTeX-related artifacts after a successful BusyTeX run. */
function formatBusyTexSynctexProbeLog(result: any, runnerSynctexPaths: string[]): string {
  const lines: string[] = ['[TeXbrain] SyncTeX probe (BusyTeX):'];
  const top = result?.synctex;
  if (top instanceof Uint8Array && top.byteLength > 0) {
    lines.push(`  result.synctex: ${top.byteLength} bytes (from BusyTexRunner / worker)`);
  } else if (top instanceof ArrayBuffer && top.byteLength > 0) {
    lines.push(`  result.synctex: ${top.byteLength} bytes (ArrayBuffer)`);
  } else {
    lines.push(
      '  result.synctex: (unset or empty — worker returns this when the pipeline emits main.synctex.gz)'
    );
  }
  const arts = collectBusyTexArtifacts(result);
  const synArts = arts.filter((a) => a.path.toLowerCase().includes('synctex'));
  if (synArts.length) {
    const parts = synArts.map((a) => {
      const n = artifactByteSize(a.value);
      return n !== undefined ? `${a.path} (${n} bytes)` : a.path;
    });
    lines.push(`  artifacts: ${parts.join('; ')}`);
  } else {
    lines.push(
      '  artifacts: (no paths containing "synctex" in outputs/files/artifacts — normal when synctex is only in result.synctex)'
    );
  }
  if (runnerSynctexPaths.length) {
    lines.push(`  readProjectFiles matches: ${runnerSynctexPaths.join(', ')}`);
  } else {
    lines.push('  readProjectFiles matches: (none or API unavailable)');
  }

  const synctexOk =
    (top instanceof Uint8Array && top.byteLength > 0) ||
    (top instanceof ArrayBuffer && top.byteLength > 0);
  if (synctexOk) {
    lines.push(
      '  note: SyncTeX gzip is present in result.synctex; UI integration (editor ↔ PDF) can parse this blob when you wire it up.'
    );
  } else {
    lines.push(
      '  note: if compile steps show xelatex/pdflatex without -synctex=1, no .synctex.gz is produced; add the flag in @vanabel/texlyre-busytex (WASM pipeline).'
    );
  }
  return '\n\n' + lines.join('\n');
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

function bblRuntimeType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (value instanceof Uint8Array) return `Uint8Array(${value.byteLength})`;
  if (value instanceof ArrayBuffer) return `ArrayBuffer(${value.byteLength})`;
  if (typeof value === 'object') {
    const v = value as any;
    const keys = Object.keys(v).slice(0, 8).join(',');
    return `object{${keys || 'no-keys'}}`;
  }
  return typeof value;
}

function bblCandidates(mainFile: string): string[] {
  const mainBase = mainFile.replace(/^.*[\\/]/, '');
  const stem = mainBase.replace(/\.tex$/i, '') || 'main';
  return [
    'main.bbl',
    '/main.bbl',
    './main.bbl',
    `${stem}.bbl`,
    `/${stem}.bbl`,
    `./${stem}.bbl`,
    'texput.bbl',
    '/texput.bbl',
    '/tmp/main.bbl',
    '/work/main.bbl'
  ];
}

async function tryReadBblFromRunner(
  runner: any,
  mainFile: string
): Promise<{ bbl?: { path: string; content: string }; attempted: string[] }> {
  const candidates = bblCandidates(mainFile);
  const attempted: string[] = [];
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
    attempted.push(p);
    const readers: Array<(() => any) | undefined> = [
      runner?.readFile ? () => runner.readFile(p) : undefined,
      runner?.fs?.readFile ? () => runner.fs.readFile(p) : undefined,
      runner?.FS?.readFile ? () => runner.FS.readFile(p, { encoding: 'utf8' }) : undefined,
      runner?.Module?.FS?.readFile ? () => runner.Module.FS.readFile(p, { encoding: 'utf8' }) : undefined
    ];
    for (const read of readers) {
      const text = await tryValue(read);
      if (text) return { bbl: { path: p.replace(/^\.?\//, ''), content: text }, attempted };
    }
  }

  // texlyre-busytex >= 0.1.7-beta exposes project file listing helpers.
  // Use it as a fallback when direct FS readers are unavailable.
  try {
    if (typeof runner?.readProjectFiles === 'function') {
      attempted.push('readProjectFiles(.)');
      const projectFiles = await runner.readProjectFiles('.');
      if (Array.isArray(projectFiles)) {
        for (const f of projectFiles) {
          const p = String((f as any)?.path || (f as any)?.name || '');
          if (!p || !p.toLowerCase().endsWith('.bbl')) continue;
          const text = readTextFromUnknown((f as any)?.content ?? (f as any)?.contents ?? (f as any)?.data);
          if (text) return { bbl: { path: p.replace(/^\.?\//, ''), content: text }, attempted };
        }
      }
    }
  } catch {
    // Ignore readProjectFiles errors and keep graceful fallback behavior.
  }

  return { attempted };
}

/**
 * 使用 @vanabel/texlyre-busytex 的 PdfLaTeX + bibtex8 编译（多轮 pdflatex/bibtex）。
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

  let runner: import('@vanabel/texlyre-busytex').BusyTexRunner;
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

  const { PdfLatex, XeLatex } = await import('@vanabel/texlyre-busytex');

  const additionalFiles: import('@vanabel/texlyre-busytex').FileInput[] = [];
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
  let result: import('@vanabel/texlyre-busytex').CompileResult;
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
        result.logs.map((l: LogEntry) => `[${l.cmd}] exit ${l.exit_code}\n${l.log || l.stdout || ''}`).join('\n')
      : '') +
    artifactNote +
    resultShapeNote;

  const rawBbl = (result as any)?.bbl;
  const bblFromResult = extractBusyTexBbl(result as any);
  const fromRunner = bblFromResult ? { attempted: [] } : await tryReadBblFromRunner(runner, mainFile);
  const bbl = bblFromResult || fromRunner.bbl;
  const bblDiag =
    '\n\n[TeXbrain] BusyTeX bbl diagnostics:\n' +
    `result.bbl runtime type: ${bblRuntimeType(rawBbl)}\n` +
    `extracted from result: ${bblFromResult ? `yes (${bblFromResult.path}, ${bblFromResult.content.length} chars)` : 'no'}\n` +
    `runner read candidates: ${(fromRunner.attempted || []).join(', ') || '(skipped)'}\n` +
    `final bbl: ${bbl ? `${bbl.path} (${bbl.content.length} chars)` : '(none)'}`;

  let synctexProbe = '';
  if (status === 0 && result.pdf) {
    const runnerSynctex = await synctexPathsFromBusyTexRunner(runner);
    synctexProbe = formatBusyTexSynctexProbeLog(result, runnerSynctex);
  }

  return {
    pdf: result.pdf,
    status,
    log: log + bblDiag + synctexProbe,
    usedBusyTex: true,
    bbl
  };
}
