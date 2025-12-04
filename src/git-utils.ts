import simpleGit, { SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  return await git.revparse(['--abbrev-ref', 'HEAD']);
}

/**
 * Get commits on current branch since divergence from base branch
 */
export async function getBranchCommits(baseBranch: string = 'main'): Promise<Array<{ hash: string; message: string }>> {
  try {
    // Try to find merge-base with main
    const mergeBase = await git.raw(['merge-base', baseBranch, 'HEAD']);

    // Get commits since merge-base
    const log = await git.log({ from: mergeBase.trim(), to: 'HEAD' });

    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
    }));
  } catch (error) {
    // If main doesn't exist, try master
    if (baseBranch === 'main') {
      return getBranchCommits('master');
    }
    throw new Error(`Could not find base branch: ${baseBranch}`);
  }
}

/**
 * Amend a commit message
 */
export async function amendCommitMessage(commitHash: string, newMessage: string): Promise<void> {
  // Use filter-branch or rebase to rewrite commit message
  // This is a simplified version - production would need interactive rebase
  await git.raw(['commit', '--amend', '-m', newMessage]);
}

/**
 * Rewrite commit messages in current branch
 */
export async function rewriteCommitMessages(
  commits: Array<{ hash: string; message: string }>,
  prefixFn: (message: string) => string
): Promise<void> {
  // Use git filter-branch to rewrite messages
  const command = commits
    .map(commit => {
      const newMessage = prefixFn(commit.message);
      return `if [ "$GIT_COMMIT" = "${commit.hash}" ]; then echo "${newMessage}"; else cat; fi`;
    })
    .join('; ');

  await git.raw([
    'filter-branch',
    '-f',
    '--msg-filter',
    command,
    'HEAD~' + commits.length + '..HEAD',
  ]);
}

/**
 * Check if working directory is clean
 */
export async function isClean(): Promise<boolean> {
  const status = await git.status();
  return status.isClean();
}
