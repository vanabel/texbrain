/** Vim jumps for LaTeX: sections (`]]`), sentences (`)`), and paragraphs (`}`). */

export type VimPos = { line: number; ch: number };

const SECTION_LINE =
  /^\s*\\(?:(?:sub)?paragraph|(?:sub)*section|chapter|part|appendix|appendices|(?:front|back|main)matter|add(?:sec|chap|part))\b|^\s*\\(?:begin|end)\{document\}/;

const SENTENCE_END = new Set(['.', '?', '!']);

function codeOf(line: string): string {
  let out = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '%' && line[i - 1] !== '\\') break;
    out += line[i];
  }
  return out;
}

function nonWs(line: string): number {
  const i = line.search(/\S/);
  return i < 0 ? 0 : i;
}

function clampCount(count: number): number {
  return count > 0 ? count : 1;
}

function isSection(line: string | undefined): boolean {
  return SECTION_LINE.test(codeOf(line || ''));
}

function sectionAfter(lines: string[], start: number): number {
  for (let i = start; i < lines.length; i++) if (isSection(lines[i])) return i;
  return -1;
}

function sectionBefore(lines: string[], start: number): number {
  for (let i = start; i >= 0; i--) if (isSection(lines[i])) return i;
  return -1;
}

/** `]]` / `[[` move to a section heading. `][` / `[]` move to the line before one. */
export function jumpSection(
  lines: string[],
  from: VimPos,
  forward: boolean,
  toEnd: boolean,
  count: number
): VimPos {
  const last = Math.max(0, lines.length - 1);
  let left = clampCount(count);
  let line = Math.min(Math.max(from.line, 0), last);

  if (!forward && !toEnd && isSection(lines[line])) {
    const col = nonWs(lines[line]);
    if (from.ch > col) {
      left--;
      if (left === 0) return { line, ch: col };
    }
  }

  while (left > 0) {
    if (!toEnd) {
      const found = forward ? sectionAfter(lines, line + 1) : sectionBefore(lines, line - 1);
      if (found < 0) return { line: forward ? last : 0, ch: 0 };
      line = found;
      left--;
      continue;
    }
    if (forward) {
      const found = sectionAfter(lines, line + 1);
      if (found < 0) return { line: last, ch: 0 };
      const dest = found - 1;
      if (dest <= line) {
        line = found;
        continue;
      }
      line = dest;
    } else {
      const found = sectionBefore(lines, line);
      const dest = found - 1;
      if (found < 0 || dest < 0 || dest >= line) return { line: 0, ch: 0 };
      line = dest;
    }
    left--;
  }
  return { line, ch: toEnd ? 0 : nonWs(lines[line] || '') };
}

/** `]m` / `[m` jump to `\begin`; `]M` / `[M` jump to `\end`. */
export function jumpEnvironment(
  lines: string[],
  from: VimPos,
  forward: boolean,
  begin: boolean,
  count: number
): VimPos {
  const re = begin ? /\\begin\s*\{/g : /\\end\s*\{/g;
  const last = Math.max(0, lines.length - 1);
  let left = clampCount(count);
  let line = from.line;
  let ch = from.ch;
  const dir = forward ? 1 : -1;

  while (left > 0) {
    let found: VimPos | null = null;
    if (forward) {
      for (let i = line; i <= last && !found; i++) {
        const code = codeOf(lines[i] || '');
        re.lastIndex = i === line ? ch + 1 : 0;
        const match = re.exec(code);
        if (match) found = { line: i, ch: match.index };
      }
    } else {
      for (let i = line; i >= 0 && !found; i--) {
        const code = codeOf(lines[i] || '');
        const limit = i === line ? ch : code.length;
        re.lastIndex = 0;
        let match: RegExpExecArray | null;
        let lastMatch: RegExpExecArray | null = null;
        while ((match = re.exec(code)) && match.index < limit) lastMatch = match;
        if (lastMatch) found = { line: i, ch: lastMatch.index };
      }
    }
    if (!found) return { line: forward ? last : 0, ch: 0 };
    line = found.line;
    ch = found.ch;
    left--;
    if (left === 0) return found;
  }
  return { line, ch };
}

function isSentenceEnd(line: string, index: number): boolean {
  const ch = line[index] ?? '';
  if ('。！？'.includes(ch)) return true;
  if (!SENTENCE_END.has(ch)) return false;
  const next = line[index + 1];
  return next === undefined || /\s/.test(next);
}

function endBefore(lines: string[], line: number, ch: number): VimPos | null {
  let i = line;
  let col = ch - 1;
  while (i >= 0) {
    const text = lines[i] || '';
    if (col >= text.length) col = text.length - 1;
    while (col >= 0) {
      if (isSentenceEnd(text, col)) return { line: i, ch: col };
      col--;
    }
    i--;
    col = Number.MAX_SAFE_INTEGER;
  }
  return null;
}

function firstText(lines: string[], line: number, ch: number): VimPos | null {
  let i = line;
  let col = ch;
  while (i < lines.length) {
    const text = lines[i];
    while (col < text.length) {
      if (!/\s/.test(text[col])) return { line: i, ch: col };
      col++;
    }
    i++;
    col = 0;
  }
  return null;
}

/** `)` / `(` move by sentences. `。！？` count as well as `.?!`. */
export function jumpSentence(lines: string[], from: VimPos, forward: boolean, count: number): VimPos {
  const last = Math.max(0, lines.length - 1);
  let left = clampCount(count);
  let line = from.line;
  let ch = from.ch;

  if (!forward) {
    while (left > 0) {
      const start = sentenceStart(lines, { line, ch });
      if (!start) return { line: 0, ch: 0 };
      if (start && (start.line < line || start.ch < ch)) {
        line = start.line;
        ch = start.ch;
        left--;
        continue;
      }
      const anchor = start ?? { line, ch };
      const end = endBefore(lines, anchor.line, anchor.ch);
      if (!end) return { line: 0, ch: nonWs(lines[0] || '') };
      const earlier = sentenceStart(lines, end);
      if (!earlier) return { line: 0, ch: 0 };
      line = earlier.line;
      ch = earlier.ch;
      left--;
    }
    return { line, ch };
  }

  while (left > 0) {
    let i = line;
    let col = ch + 1;
    let seenEnd = false;
    let landed: VimPos | null = null;
    while (i < lines.length && !landed) {
      const text = lines[i] || '';
      while (col <= text.length) {
        if (col === text.length) {
          if (seenEnd) {
            landed = firstText(lines, i + 1, 0);
            if (!landed) landed = { line: last, ch: nonWs(lines[last] || '') };
          }
          break;
        }
        if (!seenEnd && isSentenceEnd(text, col)) seenEnd = true;
        else if (seenEnd && !/\s/.test(text[col])) {
          landed = { line: i, ch: col };
          break;
        }
        col++;
      }
      if (landed) break;
      i++;
      col = 0;
    }
    if (!landed) return { line: last, ch: nonWs(lines[last] || '') };
    line = landed.line;
    ch = landed.ch;
    left--;
  }
  return { line, ch };
}

function stepBack(lines: string[], line: number, ch: number): VimPos | null {
  if (ch > 0) return { line, ch: ch - 1 };
  if (line === 0) return null;
  const prev = lines[line - 1] || '';
  return { line: line - 1, ch: prev.length };
}

/** First non-space after the previous sentence end, or the start of the buffer. */
function sentenceStart(lines: string[], from: VimPos): VimPos | null {
  let line = from.line;
  let ch = from.ch - 1;
  while (line >= 0) {
    const text = lines[line] || '';
    if (ch >= text.length) ch = text.length - 1;
    while (ch >= 0) {
      if (isSentenceEnd(text, ch)) return firstText(lines, line, ch + 1);
      ch--;
    }
    line--;
    ch = Number.MAX_SAFE_INTEGER;
  }
  return firstText(lines, 0, 0);
}

function isBlank(line: string | undefined): boolean {
  return !line || /^\s*$/.test(line);
}

/** `}` / `{` move to the next or previous blank line. */
export function jumpParagraph(lines: string[], from: VimPos, forward: boolean, count: number): VimPos {
  const last = Math.max(0, lines.length - 1);
  const dir = forward ? 1 : -1;
  let i = from.line;
  let left = clampCount(count);
  while (left > 0) {
    i += dir;
    while (i >= 0 && i <= last && !isBlank(lines[i])) i += dir;
    if (i < 0 || i > last) return { line: forward ? last : 0, ch: 0 };
    left--;
  }
  return { line: i, ch: 0 };
}
