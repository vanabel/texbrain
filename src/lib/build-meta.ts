declare const __TEXBRAIN_GIT_REVISION__: string;
declare const __TEXBRAIN_REPO_BASE__: string;

/** Short git SHA (7 chars when built from `GITHUB_SHA`), or empty if unknown. */
export const texbrainBuildRevision: string = __TEXBRAIN_GIT_REVISION__;

/** `https://github.com/owner/repo` for commit links (from `GITHUB_REPOSITORY` in CI when set). */
export const texbrainBuildRepoBase: string = __TEXBRAIN_REPO_BASE__;

/** Link to this deployment’s commit on GitHub, or `null` if revision is unknown. */
export function texbrainGitCommitUrl(): string | null {
  if (!texbrainBuildRevision) return null;
  return `${texbrainBuildRepoBase}/commit/${texbrainBuildRevision}`;
}
