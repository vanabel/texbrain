import { type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { get } from 'svelte/store';
import { projectBibKeys, projectEquations } from './project-sources';

const CITE_IN_BRACE_RE =
  /\\(?:cite|autocite|parencite|textcite|fullcite|citeauthor|citeyear|Cite|Autocite|Parencite|Textcite|Fullcite)(?:\*)?(?:\[[^\]]*\])*\{([^}]*)$/;

const EQ_IN_BRACE_RE = /\\eq(?:ref)?\{([^}]*)$/;

function filterOptions<T extends { label: string }>(
  options: T[],
  prefix: string,
  limit = 40
): T[] {
  const q = prefix.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  return options
    .filter((o) => o.label.toLowerCase().includes(q))
    .slice(0, limit);
}

export function citeKeyCompletions(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(CITE_IN_BRACE_RE);
  if (!match) return null;

  const prefix = match.text.match(/\{([^}]*)$/)?.[1] ?? '';
  const from = context.pos - prefix.length;
  const keys = get(projectBibKeys);
  if (keys.length === 0) return null;

  const options: Completion[] = filterOptions(
    keys.map((k) => ({
      label: k.key,
      detail: k.detail,
      type: 'text' as const
    })),
    prefix
  );
  if (options.length === 0) return null;

  return {
    from,
    options,
    validFor: /^[^},]*$/
  };
}

export function equationCompletions(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(EQ_IN_BRACE_RE);
  if (!match) return null;

  const prefix = match.text.match(/\{([^}]*)$/)?.[1] ?? '';
  const from = context.pos - prefix.length;
  const equations = get(projectEquations);
  if (equations.length === 0) return null;

  const byNumber = new Map<string, Completion>();
  for (const eq of equations) {
    if (!eq.number || byNumber.has(eq.number)) continue;
    byNumber.set(eq.number, {
      label: eq.number,
      detail: eq.label ? `\\label{${eq.label}}` : eq.preview,
      type: 'constant'
    });
  }

  const options = filterOptions([...byNumber.values()], prefix);
  if (options.length === 0) return null;

  return {
    from,
    options,
    validFor: /^[^},]*$/
  };
}
