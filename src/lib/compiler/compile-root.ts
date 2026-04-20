function dirNameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

/** 从 compile root 向上一层一层到仓库根，用于拾取祖先目录里的类文件。 */
function ancestorDirsForCompileRoot(compileRootDir: string): string[] {
  const dirs: string[] = [];
  if (!compileRootDir) return dirs;
  let d = compileRootDir;
  for (;;) {
    const i = d.lastIndexOf('/');
    if (i < 0) {
      dirs.push('');
      break;
    }
    d = d.slice(0, i);
    dirs.push(d);
  }
  return dirs;
}

/**
 * 将主 .tex 所在目录视为「编译根目录」：只把该目录下的文件送入 TeX/BibTeX，
 * 路径改为相对该目录（与本地在该子目录中运行 pdflatex/bibtex 一致）。
 *
 * 此外会把**主文件祖先目录**中的 `.cls` / `.sty` / `.clo` / `.cfg` 以**仅文件名**并入
 * 编译根（不覆盖子目录里已有同名文件），避免 `swuthesis.cls` 等在上一级时既被 TeX
 * 找到（Kpathsea/相对路径）又在切片 map 中缺失，导致 `projectNeedsBibtexEngine` 读不到
 * `backend=bibtex` 而跳过 bibtex8。
 */
export function sliceProjectToCompileRoot(
  mainFile: string,
  files: Map<string, string>,
  binaryFiles?: Map<string, ArrayBuffer>
): {
  mainFile: string;
  files: Map<string, string>;
  binaryFiles?: Map<string, ArrayBuffer>;
  /** 原工程中主文件所在目录，正斜杠、无首尾斜杠；主文件在根上则为 '' */
  compileRootDir: string;
} {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\/+/, '');
  const mainNorm = norm(mainFile);
  const slash = mainNorm.lastIndexOf('/');
  if (slash < 0) {
    return { mainFile: mainNorm, files, binaryFiles, compileRootDir: '' };
  }

  const compileRootDir = mainNorm.slice(0, slash);
  const newMain = mainNorm.slice(slash + 1);
  const prefix = `${compileRootDir}/`;

  const newFiles = new Map<string, string>();
  for (const [path, content] of files) {
    const p = norm(path);
    if (p.startsWith(prefix)) {
      newFiles.set(p.slice(prefix.length), content);
    }
  }

  const auxExt = /\.(cls|sty|clo|cfg)$/i;
  for (const parentDir of ancestorDirsForCompileRoot(compileRootDir)) {
    for (const [path, content] of files) {
      const p = norm(path);
      if (p.startsWith(prefix)) continue;
      if (!auxExt.test(p)) continue;
      if (dirNameOf(p) !== parentDir) continue;
      const base = p.slice(p.lastIndexOf('/') + 1);
      if (!newFiles.has(base)) newFiles.set(base, content);
    }
  }

  if (!newFiles.has(newMain)) {
    const c = files.get(mainNorm) ?? files.get(mainFile);
    if (c !== undefined) newFiles.set(newMain, c);
  }

  if (newFiles.size === 0) {
    return { mainFile: mainNorm, files, binaryFiles, compileRootDir: '' };
  }

  let newBinary: Map<string, ArrayBuffer> | undefined;
  if (binaryFiles?.size) {
    newBinary = new Map();
    for (const [path, buf] of binaryFiles) {
      const p = norm(path);
      if (p.startsWith(prefix)) {
        newBinary.set(p.slice(prefix.length), buf);
      }
    }
  }

  return {
    mainFile: newMain,
    files: newFiles,
    binaryFiles: newBinary,
    compileRootDir
  };
}

/** 将编译器返回的 .bbl 路径映射回工程内的完整相对路径（与主 .tex 同目录）。 */
export function remapBblToProjectPath(
  compileRootDir: string,
  originalMainFile: string,
  bbl: { path: string; content: string } | undefined
): { path: string; content: string } | undefined {
  if (!bbl?.content) return bbl;
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\/+/, '');
  const mainBase = norm(originalMainFile).split('/').pop() || 'main.tex';
  const bblName = mainBase.replace(/\.tex$/i, '.bbl');
  const projectPath = compileRootDir ? `${compileRootDir}/${bblName}` : bblName;
  return { path: projectPath, content: bbl.content };
}
