import simpleGit, { SimpleGit } from 'simple-git';

const git: SimpleGit = simpleGit();

/**
 * Get current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  return await git.revparse(['--abbrev-ref', 'HEAD']);
}

/**
 * Find the base branch (main or master)
 */
export async function findBaseBranch(): Promise<string> {
  try {
    await git.revparse(['--verify', 'main']);
    return 'main';
  } catch {
    try {
      await git.revparse(['--verify', 'master']);
      return 'master';
    } catch {
      throw new Error('Could not find base branch (main or master)');
    }
  }
}

/**
 * Get commits on current branch since divergence from base branch
 * Uses: base=$(git merge-base HEAD main); git log $base..HEAD
 * Excludes merge commits automatically
 */
export async function getBranchCommits(baseBranch?: string): Promise<Array<{ hash: string; message: string; shortHash: string; isMerge: boolean }>> {
  const base = baseBranch || await findBaseBranch();

  try {
    // Find where current branch diverged from base
    const mergeBase = await git.raw(['merge-base', 'HEAD', base]);
    const mergeBaseHash = mergeBase.trim();

    // Get commits with parent count to detect merges
    // Format: hash|subject|parent_count
    const logOutput = await git.raw([
      'log',
      '--pretty=format:%H|%s|%P',  // hash|subject|parents
      '--no-merges',  // Skip merge commits
      `${mergeBaseHash}..HEAD`
    ]);

    if (!logOutput.trim()) {
      return [];
    }

    // Parse output (oldest first for rebase order)
    return logOutput
      .trim()
      .split('\n')
      .reverse()
      .map(line => {
        const parts = line.split('|');
        const hash = parts[0];
        const message = parts[1] || '';
        const parents = parts[2] || '';

        return {
          hash,
          shortHash: hash.substring(0, 7),
          message,
          isMerge: parents.split(' ').length > 1,
        };
      });

  } catch (error) {
    throw new Error(`Could not find commits on branch (base: ${base})`);
  }
}

/**
 * Rewrite commit messages using git filter-branch
 * @param baseBranch - Base branch to compare against (main/master)
 * @param prefix - Ticket prefix to add/replace (e.g., JIRA-123)
 * @param replaceExisting - If true, replace existing prefixes; if false, skip commits with prefixes
 */
export async function rewriteCommitMessages(
  baseBranch: string,
  prefix: string,
  replaceExisting: boolean = false
): Promise<void> {
  try {
    const script = replaceExisting
      ? `
        msg="$(cat)"
        # Replace existing ticket or add new one
        # Remove any existing ticket pattern (anywhere in message) and add the new one
        echo "$msg" | sed -E 's/[A-Z]{2,10}-[0-9]{2,10} ?//' | sed "s/^/${prefix} /"
      `
      : `
        msg="$(cat)"
        # Only add prefix if no ticket exists anywhere in message
        if ! echo "$msg" | grep -qE '[A-Z]{2,10}-[0-9]{2,10}'; then
          echo "${prefix} $msg"
        else
          echo "$msg"
        fi
      `;

    // Execute git filter-branch
    await git.raw([
      'filter-branch',
      '-f',
      '--msg-filter',
      script,
      `${baseBranch}..HEAD`
    ]);

  } catch (error: any) {
    throw new Error(`Failed to rewrite commits: ${error.message}`);
  }
}

/**
 * Check if working directory is clean
 */
export async function isClean(): Promise<boolean> {
  const status = await git.status();
  return status.isClean();
}

/**
 * Check if current branch has been pushed to remote
 */
export async function hasRemote(): Promise<boolean> {
  try {
    const status = await git.status();
    return status.tracking !== null;
  } catch {
    return false;
  }
}

/**
 * Check if current branch has unpushed commits
 */
export async function hasUnpushedCommits(): Promise<boolean> {
  try {
    const status = await git.status();
    return status.ahead > 0;
  } catch {
    return false;
  }
}

/**
 * Clean up git filter-branch backup refs
 */
export async function cleanupBackupRefs(): Promise<void> {
  try {
    await git.raw(['for-each-ref', '--format=%(refname)', 'refs/original/']);
    // Delete all backup refs
    await git.raw(['update-ref', '-d', 'refs/original/refs/heads/*']);
  } catch (error) {
    // Ignore errors - backup refs might not exist
  }
}
