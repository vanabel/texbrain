import { get, writable } from 'svelte/store';
import { collectProjectBibKeys, type BibKeyEntry } from '$lib/tex/parse-bibkeys';
import { parseEquationsWithIncludes, type EquationRef } from '$lib/tex/parse-equations';
import { mergeTexFileMap } from '$lib/project/tex-file-map';
import { mergeBibFileMap } from '$lib/project/bib-file-map';
import { files, entryPoint } from '$lib/project/store';

/** Skip full-project equation scan above this many .tex paths (keeps UI responsive). */
const MAX_TEX_FILES_FOR_EQUATIONS = 120;

export const projectBibKeys = writable<BibKeyEntry[]>([]);
export const projectEquations = writable<EquationRef[]>([]);

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

export function recomputeProjectSources(): void {
  const tabs = get(files);
  const texFiles = mergeTexFileMap(diskTexFiles, tabs);
  const bibFiles = mergeBibFileMap(diskBibFiles, tabs);
  const allText = new Map([...texFiles, ...bibFiles]);

  projectBibKeys.set(collectProjectBibKeys(allText));

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
