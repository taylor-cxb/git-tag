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
 */
export async function getBranchCommits(baseBranch?: string): Promise<Array<{ hash: string; message: string; shortHash: string }>> {
  const base = baseBranch || await findBaseBranch();

  try {
    // Find where current branch diverged from base
    // Same as: base=$(git merge-base HEAD main)
    const mergeBase = await git.raw(['merge-base', 'HEAD', base]);
    const mergeBaseHash = mergeBase.trim();

    // Get commits unique to this branch
    // Same as: git log --pretty=format:"%H|%s" $base..HEAD
    const logOutput = await git.raw([
      'log',
      '--pretty=format:%H|%s',  // hash|subject
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
        const [hash, message] = line.split('|');
        return {
          hash,
          shortHash: hash.substring(0, 7),
          message: message || '',
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
        # Replace existing prefix or add new one
        # Remove any existing prefix pattern and add the new one
        echo "$msg" | sed -E 's/^[A-Z]{2,10}-[0-9]{2,10} //' | sed "s/^/${prefix} /"
      `
      : `
        msg="$(cat)"
        # Only add prefix if none exists
        if ! echo "$msg" | grep -qE '^[A-Z]{2,10}-[0-9]{2,10}'; then
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
