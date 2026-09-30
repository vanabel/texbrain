/**
 * Lazy-loaded git engine so isomorphic-git / LightningFS stay out of the initial editor chunk.
 * All UI / project code should import from here — not `$lib/git/engine` — or Vite will pull
 * the engine into the main graph and the dynamic import will not create a separate chunk.
 */
type GitEngine = typeof import('./engine');

let enginePromise: Promise<GitEngine> | null = null;

function loadEngine(): Promise<GitEngine> {
  enginePromise ??= import('./engine');
  return enginePromise;
}

export async function initFs(...args: Parameters<GitEngine['initFs']>) {
  return (await loadEngine()).initFs(...args);
}
export async function destroyGitFs(...args: Parameters<GitEngine['destroyGitFs']>) {
  return (await loadEngine()).destroyGitFs(...args);
}
export async function syncFilesToGit(...args: Parameters<GitEngine['syncFilesToGit']>) {
  return (await loadEngine()).syncFilesToGit(...args);
}
export async function writeFileToGit(...args: Parameters<GitEngine['writeFileToGit']>) {
  return (await loadEngine()).writeFileToGit(...args);
}
export async function deleteFileFromGit(...args: Parameters<GitEngine['deleteFileFromGit']>) {
  return (await loadEngine()).deleteFileFromGit(...args);
}
export async function readAllFilesFromGit(...args: Parameters<GitEngine['readAllFilesFromGit']>) {
  return (await loadEngine()).readAllFilesFromGit(...args);
}
export async function isGitRepo(...args: Parameters<GitEngine['isGitRepo']>) {
  return (await loadEngine()).isGitRepo(...args);
}
export async function initRepo(...args: Parameters<GitEngine['initRepo']>) {
  return (await loadEngine()).initRepo(...args);
}
export async function checkAndLoadGit(...args: Parameters<GitEngine['checkAndLoadGit']>) {
  return (await loadEngine()).checkAndLoadGit(...args);
}
export async function getStatus(...args: Parameters<GitEngine['getStatus']>) {
  return (await loadEngine()).getStatus(...args);
}
export async function stageFile(...args: Parameters<GitEngine['stageFile']>) {
  return (await loadEngine()).stageFile(...args);
}
export async function unstageFile(...args: Parameters<GitEngine['unstageFile']>) {
  return (await loadEngine()).unstageFile(...args);
}
export async function stageAll(...args: Parameters<GitEngine['stageAll']>) {
  return (await loadEngine()).stageAll(...args);
}
export async function unstageAll(...args: Parameters<GitEngine['unstageAll']>) {
  return (await loadEngine()).unstageAll(...args);
}
export async function commit(...args: Parameters<GitEngine['commit']>) {
  return (await loadEngine()).commit(...args);
}
export async function getLog(...args: Parameters<GitEngine['getLog']>) {
  return (await loadEngine()).getLog(...args);
}
export async function getBranchTips(...args: Parameters<GitEngine['getBranchTips']>) {
  return (await loadEngine()).getBranchTips(...args);
}
export async function getCurrentBranch(...args: Parameters<GitEngine['getCurrentBranch']>) {
  return (await loadEngine()).getCurrentBranch(...args);
}
export async function listBranches(...args: Parameters<GitEngine['listBranches']>) {
  return (await loadEngine()).listBranches(...args);
}
export async function createBranch(...args: Parameters<GitEngine['createBranch']>) {
  return (await loadEngine()).createBranch(...args);
}
export async function switchBranch(...args: Parameters<GitEngine['switchBranch']>) {
  return (await loadEngine()).switchBranch(...args);
}
export async function deleteBranch(...args: Parameters<GitEngine['deleteBranch']>) {
  return (await loadEngine()).deleteBranch(...args);
}
export async function merge(...args: Parameters<GitEngine['merge']>) {
  return (await loadEngine()).merge(...args);
}
export async function addRemote(...args: Parameters<GitEngine['addRemote']>) {
  return (await loadEngine()).addRemote(...args);
}
export async function listRemotes(...args: Parameters<GitEngine['listRemotes']>) {
  return (await loadEngine()).listRemotes(...args);
}
export async function removeRemote(...args: Parameters<GitEngine['removeRemote']>) {
  return (await loadEngine()).removeRemote(...args);
}
export async function push(...args: Parameters<GitEngine['push']>) {
  return (await loadEngine()).push(...args);
}
export async function pull(...args: Parameters<GitEngine['pull']>) {
  return (await loadEngine()).pull(...args);
}
export async function cloneRepo(...args: Parameters<GitEngine['cloneRepo']>) {
  return (await loadEngine()).cloneRepo(...args);
}
export async function getFileDiff(...args: Parameters<GitEngine['getFileDiff']>) {
  return (await loadEngine()).getFileDiff(...args);
}
export async function getCommitChangedFiles(
  ...args: Parameters<GitEngine['getCommitChangedFiles']>
) {
  return (await loadEngine()).getCommitChangedFiles(...args);
}
export async function readFileAtCommit(...args: Parameters<GitEngine['readFileAtCommit']>) {
  return (await loadEngine()).readFileAtCommit(...args);
}
export async function getCommitFileDiff(...args: Parameters<GitEngine['getCommitFileDiff']>) {
  return (await loadEngine()).getCommitFileDiff(...args);
}
export async function refreshGitState(...args: Parameters<GitEngine['refreshGitState']>) {
  return (await loadEngine()).refreshGitState(...args);
}
