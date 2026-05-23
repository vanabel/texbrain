/** Lazy-loaded git engine so isomorphic-git stays out of the initial editor chunk. */
type GitEngine = typeof import('./engine');

let enginePromise: Promise<GitEngine> | null = null;

function loadEngine(): Promise<GitEngine> {
  enginePromise ??= import('./engine');
  return enginePromise;
}

export async function initFs(projectId: string) {
  return (await loadEngine()).initFs(projectId);
}

export async function initRepo() {
  return (await loadEngine()).initRepo();
}

export async function syncFilesToGit(projectFiles: Map<string, string>) {
  return (await loadEngine()).syncFilesToGit(projectFiles);
}

export async function writeFileToGit(path: string, content: string) {
  return (await loadEngine()).writeFileToGit(path, content);
}

export async function checkAndLoadGit() {
  return (await loadEngine()).checkAndLoadGit();
}

export async function refreshGitState() {
  return (await loadEngine()).refreshGitState();
}

export async function readAllFilesFromGit() {
  return (await loadEngine()).readAllFilesFromGit();
}

export async function stageAll() {
  return (await loadEngine()).stageAll();
}

export async function commit(message: string) {
  return (await loadEngine()).commit(message);
}
