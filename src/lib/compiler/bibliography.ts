interface BibEntry {
  type: string;
  key: string;
  fields: Record<string, string>;
}

function parseBibFile(content: string): Map<string, BibEntry> {
  const entries = new Map<string, BibEntry>();
  let i = 0;
  while (i < content.length) {
    const atIdx = content.indexOf('@', i);
    if (atIdx === -1) break;
    i = atIdx + 1;

    const typeMatch = content.slice(i).match(/^(\w+)\s*\{/);
    if (!typeMatch) continue;
    const type = typeMatch[1].toLowerCase();
    i += typeMatch[0].length;

    if (type === 'comment' || type === 'string' || type === 'preamble') {
      let depth = 1;
      while (i < content.length && depth > 0) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') depth--;
        i++;
      }
      continue;
    }

    const keyMatch = content.slice(i).match(/^([^,\s}]+)\s*,/);
    if (!keyMatch) continue;
    const key = keyMatch[1].trim();
    i += keyMatch[0].length;

    const fields: Record<string, string> = {};
    while (i < content.length) {
      while (i < content.length && /[\s,]/.test(content[i])) i++;
      if (i >= content.length || content[i] === '}') { i++; break; }

      const fieldMatch = content.slice(i).match(/^(\w+)\s*=\s*/);
      if (!fieldMatch) { i++; continue; }
      const fieldName = fieldMatch[1].toLowerCase();
      i += fieldMatch[0].length;

      let value = '';
      if (content[i] === '{') {
        let depth = 1; i++;
        const start = i;
        while (i < content.length && depth > 0) {
          if (content[i] === '{') depth++;
          else if (content[i] === '}') depth--;
          if (depth > 0) i++;
        }
        value = content.slice(start, i);
        i++;
      } else if (content[i] === '"') {
        i++;
        const start = i;
        while (i < content.length && content[i] !== '"') i++;
        value = content.slice(start, i);
        i++;
      } else {
        const raw = content.slice(i).match(/^([^\s,}]+)/);
        if (raw) { value = raw[1]; i += value.length; }
      }
      fields[fieldName] = value;
    }

    entries.set(key, { type, key, fields });
  }
  return entries;
}

function findCitations(text: string): string[] {
  const keys: string[] = [];
  const re = /\\(?:cite|autocite|parencite|textcite|fullcite|citeauthor|citeyear|Cite|Autocite|Parencite|Textcite|Fullcite)(?:\*)?(?:\[[^\]]*\])*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    for (const k of m[1].split(',')) {
      const t = k.trim();
      if (t && !keys.includes(t)) keys.push(t);
    }
  }
  return keys;
}

function formatAuthor(raw: string): string {
  return raw.split(/\s+and\s+/i).map(a => {
    const parts = a.trim().split(/\s+/);
    if (parts.length < 2) return a.trim();
    const last = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0] + '.').join('~');
    return initials + '~' + last;
  }).join(', ');
}

function formatEntry(e: BibEntry): string {
  const f = e.fields;
  const parts: string[] = [];

  if (f.author) parts.push(formatAuthor(f.author));

  if (f.title) {
    if (['article', 'inproceedings', 'incollection', 'inbook'].includes(e.type)) {
      parts.push('``' + f.title + "''");
    } else {
      parts.push('\\textit{' + f.title + '}');
    }
  }

  if (e.type === 'article' && f.journal) {
    let s = '\\textit{' + f.journal + '}';
    if (f.volume) s += ', vol.~' + f.volume;
    if (f.number) s += ', no.~' + f.number;
    if (f.pages) s += ', pp.~' + f.pages;
    parts.push(s);
  } else if (['inproceedings', 'incollection'].includes(e.type) && f.booktitle) {
    parts.push('in \\textit{' + f.booktitle + '}');
    if (f.pages) parts.push('pp.~' + f.pages);
  } else if (e.type === 'inbook') {
    if (f.booktitle) parts.push('in \\textit{' + f.booktitle + '}');
    if (f.publisher) parts.push(f.publisher);
    if (f.pages) parts.push('pp.~' + f.pages);
  } else if (e.type === 'book' || e.type === 'manual') {
    if (f.publisher) parts.push(f.publisher);
    if (f.organization) parts.push(f.organization);
  }

  if (f.year) parts.push(f.year);
  if (f.url) parts.push('\\url{' + f.url + '}');
  if (f.note) parts.push(f.note);

  return parts.join(', ') + '.';
}

export function patchBiblatexFiles(files: Map<string, string>): Map<string, string> {
  let usesBiblatex = false;
  let bibPath = '';

  for (const [, content] of files) {
    if (/\\usepackage(\[[^\]]*\])?\{biblatex\}/.test(content)) usesBiblatex = true;
    const m = content.match(/\\addbibresource\{([^}]+)\}/);
    if (m) bibPath = m[1];
  }

  if (!usesBiblatex || !bibPath) return files;

  const bibContent = files.get(bibPath);
  if (!bibContent) return files;

  const entries = parseBibFile(bibContent);
  const allText = [...files.values()].join('\n');
  const citations = findCitations(allText);
  if (citations.length === 0) return files;

  const items = citations
    .filter(k => entries.has(k))
    .map(k => '\\bibitem{' + k + '}\n' + formatEntry(entries.get(k)!))
    .join('\n\n');

  const bbl =
    '\\renewcommand{\\bibname}{}\\renewcommand{\\refname}{}\n' +
    '\\begin{thebibliography}{' + citations.length + '}\n\n' +
    items + '\n\n' +
    '\\end{thebibliography}';

  const patched = new Map(files);
  for (const [path, content] of patched) {
    let c = content;
    c = c.replace(/\\usepackage(\[[^\]]*\])?\{biblatex\}/g, '');
    c = c.replace(/\\addbibresource\{[^}]+\}/g, '');
    c = c.replace(/\\printbibliography(\[[^\]]*\])?/g, bbl);
    c = c.replace(/\\(?:autocite|parencite|textcite|fullcite|Autocite|Parencite|Textcite|Fullcite)(\*)?/g, '\\cite');
    patched.set(path, c);
  }

  return patched;
}
