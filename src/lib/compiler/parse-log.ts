export type CompileDiagnostic = {
  type: 'error' | 'warning';
  message: string;
  line?: number;
  file?: string;
  context?: string;
};

/** BusyTeX appends `--- steps ---`; prefer the last latex engine chunk for warnings. */
export function selectLastLatexEngineLogForWarnings(rawLog: string): string {
  const delimMatch = rawLog.match(/\n--- steps ---\n/);
  if (!delimMatch || delimMatch.index === undefined) return rawLog;
  const stepsSection = rawLog.slice(delimMatch.index + delimMatch[0].length);
  const chunks = stepsSection.split(/\n(?=\[[^\]]+\] exit \d+\n)/);
  const latexCmdRe = /^\[(xelatex|pdflatex|lualatex|latex|uplatex|tectonic)\b/i;
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i].replace(/^\uFEFF/, '').trimStart();
    const header = chunk.match(/^\[([^\]]+)\] exit \d+\n/);
    if (!header) continue;
    if (latexCmdRe.test(`[${header[1]}]`)) {
      return chunk.slice(header[0].length);
    }
  }
  return rawLog;
}

function dedupeDiagnostics(items: CompileDiagnostic[]): CompileDiagnostic[] {
  const seen = new Set<string>();
  const out: CompileDiagnostic[] = [];
  for (const item of items) {
    const key = [
      item.type,
      item.message.replace(/\s+/g, ' ').trim(),
      String(item.line ?? ''),
      item.context ?? '',
      item.file ?? ''
    ].join('\u0001');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function isSuppressedWarning(msg: string): boolean {
  const patterns = [
    /shell escape.*disabled/i,
    /You have requested package/,
    /You have requested, on input line.*version/,
    /^(Underfull|Overfull)\s+\\[hv]box/,
    /pdfTeX warning:.*PDF inclusion: found PDF/,
    /ABD: EveryShipout/
  ];
  return patterns.some((p) => p.test(msg));
}

/** LaTeX wraps long warnings onto indented or `(package)` continuation lines. */
function joinWrappedWarning(rows: string[], start: number): { text: string; end: number } {
  const parts = [rows[start].trim()];
  let end = start;
  for (let j = start + 1; j < rows.length; j++) {
    const raw = rows[j];
    const trimmed = raw.trim();
    if (!trimmed) break;
    if (/^(?:LaTeX|Package \w+) Warning:/i.test(trimmed)) break;
    if (trimmed.startsWith('! ') || /^pdfTeX warning:/i.test(trimmed)) break;
    const indented = /^\s+\S/.test(raw);
    const pkgCont = /^\([A-Za-z][\w.-]*\)\s+\S/.test(trimmed);
    if (!indented && !pkgCont) break;
    const piece = pkgCont ? trimmed.replace(/^\([A-Za-z][\w.-]*\)\s+/, '') : trimmed;
    if (!piece) break;
    parts.push(piece);
    end = j;
  }
  return { text: parts.join(' '), end };
}

function collectWarningsFromText(
  text: string,
  defaultFile: string
): CompileDiagnostic[] {
  const out: CompileDiagnostic[] = [];
  const rows = text.split('\n');
  let currentFile = defaultFile;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const opening = /\((?:\.\/)?([^\s()]+\.tex)\b/.exec(row);
    if (opening) currentFile = opening[1];
    const trimmed = row.trim();
    if (/LaTeX Warning:/i.test(trimmed) || /Package \w+ Warning:/i.test(trimmed)) {
      const joined = joinWrappedWarning(rows, i);
      i = joined.end;
      const full = joined.text;
      const warnMatch = full.match(/Warning:\s*(.+)/i);
      const msg = warnMatch ? warnMatch[1] : full;
      if (isSuppressedWarning(full) || isSuppressedWarning(msg)) continue;
      let lineNum: number | undefined;
      const lm = full.match(/on input line (\d+)/);
      if (lm) lineNum = parseInt(lm[1], 10);
      out.push({
        type: 'warning',
        message: msg.replace(/\s+/g, ' ').trim(),
        line: lineNum,
        file: currentFile
      });
    } else if (/pdfTeX warning:/i.test(trimmed) && !/fontmap entry/.test(trimmed)) {
      if (!isSuppressedWarning(trimmed)) {
        out.push({ type: 'warning', message: trimmed, file: currentFile });
      }
    }
  }
  return out;
}

/**
 * Parse latex / tectonic logs into structured diagnostics.
 * Tracks the current `.tex` file from `(./path.tex` openers when available.
 */
export function parseCompileLog(
  rawLog: string,
  defaultPath = 'main.tex'
): { errors: CompileDiagnostic[]; cleanedLines: string[] } {
  const errors: CompileDiagnostic[] = [];
  const lines = rawLog.split('\n');
  const cleanedLines: string[] = [];
  let currentFile = defaultPath;

  const noisePatterns = [
    /^\s*\(\/tex\//,
    /^\s*\(\/tex\/[^)]*$/,
    /^\s*\)\s*$/,
    /^\s*\)+\s*$/,
    /^\s*\(\/?tex\//,
    /^pdfTeX warning:.*fontmap entry/,
    /^\s*exists, duplicates ignored$/,
    /^ABD: Every/,
    /^\*geometry\*/,
    /^1773\d+/,
    /^\s*$/
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const opening = /\((?:\.\/)?([^\s()]+\.tex)\b/.exec(line);
    if (opening) currentFile = opening[1];

    const direct =
      /^\s*(?:error:\s*)?(?:\.\/)?(.+?\.(?:tex|sty|cls|bib)):(\d+):(?:\d+:)?\s*(.*)/.exec(trimmed);
    if (direct && !/^\s*(?:-->|→)/.test(line)) {
      errors.push({
        type: /warning|overfull|underfull/i.test(direct[3]) ? 'warning' : 'error',
        message: direct[3],
        line: Number(direct[2]),
        file: direct[1]
      });
      cleanedLines.push(line);
      continue;
    }

    if (trimmed.startsWith('! ')) {
      const msg = trimmed.slice(2);
      let lineNum: number | undefined;
      let context: string | undefined;
      let file = currentFile;
      const maxLook = 48;
      for (let j = i + 1; j < Math.min(i + maxLook, lines.length); j++) {
        const jtrim = lines[j].trim();
        const m = jtrim.match(/^l\.(\d+)(?:\s+(.*))?$/);
        if (m) {
          lineNum = parseInt(m[1], 10);
          const tail = m[2]?.trim();
          if (tail) context = `l.${lineNum} ${tail}`;
          break;
        }
        const pointer = /^(?:-->|→)\s*(?:\.\/)?(.+?\.(?:tex|sty|cls|bib)):(\d+)/.exec(jtrim);
        if (pointer) {
          file = pointer[1];
          lineNum = Number(pointer[2]);
        }
      }
      errors.push({
        type: 'error',
        message: msg,
        line: lineNum,
        file,
        context
      });
      cleanedLines.push(line);
      continue;
    }

    if (noisePatterns.some((p) => p.test(trimmed))) continue;
    cleanedLines.push(line);
  }

  const warnSource = selectLastLatexEngineLogForWarnings(rawLog);
  const warnings = collectWarningsFromText(warnSource, defaultPath);
  const onlyErrors = errors.filter((e) => e.type === 'error');

  return {
    errors: prioritizeFirstFatal(dedupeDiagnostics([...onlyErrors, ...warnings])),
    cleanedLines
  };
}

/** Put the first actionable fatal error first; demote TeX abort noise. */
export function prioritizeFirstFatal(items: CompileDiagnostic[]): CompileDiagnostic[] {
  const abortRe = /Emergency stop|Fatal error occurred|==> Fatal error/i;
  const errItems = items.filter((i) => i.type === 'error');
  const warnings = items.filter((i) => i.type === 'warning');
  const actionable = errItems.filter((e) => !abortRe.test(e.message));
  const aborts = errItems.filter((e) => abortRe.test(e.message));
  return [...actionable, ...aborts, ...warnings];
}

export function firstFatalError(
  items: CompileDiagnostic[]
): CompileDiagnostic | undefined {
  return items.find((i) => i.type === 'error');
}
