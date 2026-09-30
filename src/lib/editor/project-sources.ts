import { get, writable } from 'svelte/store';
import { collectProjectBibKeys, type BibKeyEntry } from '$lib/tex/parse-bibkeys';
import { parseEquationsWithIncludes, type EquationRef } from '$lib/tex/parse-equations';
import { collectProjectLabels, type LabelRef } from '$lib/tex/parse-labels';
import { latexDiagnostics } from '$lib/tex/latex-diagnostics';
import { mergeTexFileMap } from '$lib/project/tex-file-map';
import { mergeBibFileMap } from '$lib/project/bib-file-map';
import { files, entryPoint } from '$lib/project/store';
import { staticDiagnostics } from '$lib/stores/app';

/** Skip full-project equation scan above this many .tex paths (keeps UI responsive). */
const MAX_TEX_FILES_FOR_EQUATIONS = 120;
const MAX_TEX_FILES_FOR_LABELS = 200;

export const projectBibKeys = writable<BibKeyEntry[]>([]);
export const projectEquations = writable<EquationRef[]>([]);
export const projectLabels = writable<LabelRef[]>([]);

let diskTexFiles = new Map<string, string>();
let diskBibFiles = new Map<string, string>();
let recomputeTimer: ReturnType<typeof setTimeout> | null = null;

export function setDiskTexFiles(map: Map<string, string>): void {
  diskTexFiles = map;
}

export function setDiskBibFiles(map: Map<string, string>): void {
  diskBibFiles = map;
}

/** Debounced refresh (editor typing, tab saves). */
export function scheduleRecomputeProjectSources(delayMs = 450): void {
  if (recomputeTimer != null) clearTimeout(recomputeTimer);
  recomputeTimer = setTimeout(() => {
    recomputeTimer = null;
    recomputeProjectSources();
  }, delayMs);
}

/** Immediate refresh (disk load, entry point change, compile). */
export function recomputeProjectSourcesNow(): void {
  if (recomputeTimer != null) {
    clearTimeout(recomputeTimer);
    recomputeTimer = null;
  }
  recomputeProjectSources();
}

/** All project-relative .tex / .ltx paths (disk + open tabs) for SyncTeX path matching. */
export function getProjectTexPaths(): string[] {
  return [...mergeTexFileMap(diskTexFiles, get(files)).keys()].filter((p) =>
    /\.(tex|ltx)$/i.test(p)
  );
}

/** Merged text map for search / follow (disk + open tabs). */
export function getMergedProjectTextMap(): Map<string, string> {
  const tabs = get(files);
  const texFiles = mergeTexFileMap(diskTexFiles, tabs);
  const bibFiles = mergeBibFileMap(diskBibFiles, tabs);
  return new Map([...texFiles, ...bibFiles]);
}

export function recomputeProjectSources(): void {
  const tabs = get(files);
  const texFiles = mergeTexFileMap(diskTexFiles, tabs);
  const bibFiles = mergeBibFileMap(diskBibFiles, tabs);
  const allText = new Map([...texFiles, ...bibFiles]);

  projectBibKeys.set(collectProjectBibKeys(allText));

  if (texFiles.size <= MAX_TEX_FILES_FOR_LABELS) {
    try {
      projectLabels.set(collectProjectLabels(texFiles));
    } catch {
      projectLabels.set([]);
    }
  } else {
    projectLabels.set([]);
  }

  try {
    const diags = latexDiagnostics(
      [...allText.entries()].map(([path, source]) => ({ path, source }))
    );
    staticDiagnostics.set(
      diags.map((d) => ({
        type: d.severity,
        message: d.message,
        line: d.line,
        file: d.path,
        from: d.from,
        to: d.to,
        source: 'latex' as const
      }))
    );
  } catch {
    staticDiagnostics.set([]);
  }

  const root = get(entryPoint);
  const eqRoot =
    root && texFiles.has(root)
      ? root
      : [...texFiles.keys()].sort((a, b) => a.localeCompare(b))[0] ?? null;

  if (!eqRoot || texFiles.size > MAX_TEX_FILES_FOR_EQUATIONS) {
    projectEquations.set([]);
    return;
  }

  try {
    projectEquations.set(parseEquationsWithIncludes(eqRoot, texFiles));
  } catch {
    projectEquations.set([]);
  }
}
