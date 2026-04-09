/**
 * 将主 .tex 所在目录视为「编译根目录」：只把该目录下的文件送入 TeX/BibTeX，
 * 路径改为相对该目录（与本地在该子目录中运行 pdflatex/bibtex 一致）。
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
