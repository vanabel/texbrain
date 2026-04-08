/**
 * 决定本次编译的「主 .tex」路径。
 *
 * - `active-tab`：当前活动 tab 是 `.tex` 时优先编译它，否则回退 entry point。
 * - `entry-point`：始终优先编译 entry point，不可用时才回退当前 tab。
 */
export type CompileMainMode = 'active-tab' | 'entry-point';

export function resolveCompileMainFile(
  mode: CompileMainMode,
  entryPoint: string | null,
  activePath: string | undefined,
  activeName: string,
  projectFiles: Map<string, string>
): string {
  const pathKey = (activePath || activeName).trim();
  const activeIsTex = pathKey.toLowerCase().endsWith('.tex');
  const hasEntryPoint = !!entryPoint && projectFiles.has(entryPoint);

  if (mode === 'entry-point') {
    if (hasEntryPoint) return entryPoint!;
    if (activeIsTex) return pathKey;
    return entryPoint || pathKey;
  }

  if (activeIsTex) return pathKey;
  return entryPoint || pathKey;
}
