#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import {
  extractTicketFromBranch,
  formatCommitMessage,
  isValidTicket,
  hasPrefix,
} from './config';
import {
  getCurrentBranch,
  getBranchCommits,
  isClean,
  hasRemote,
  cleanupBackupRefs,
} from './git-utils';

program
  .name('git-tag')
  .description('Add ticket prefixes to git commits on current branch')
  .version('1.0.0')
  .option('--ticket <ticket>', 'Manually specify ticket number (e.g., JIRA-123)')
  .option('--prefix <prefix>', 'Use custom prefix instead of ticket number')
  .option('--replace', 'Replace existing ticket prefixes instead of skipping them')
  .option('--force', 'Allow rewriting commits that have been pushed to remote')
  .option('--dry-run', 'Show what would be changed without modifying commits')
  .parse(process.argv);

const options = program.opts<{
  ticket?: string;
  prefix?: string;
  replace?: boolean;
  force?: boolean;
  dryRun?: boolean;
}>();

async function main() {
  try {
    // Check if in a git repository
    const currentBranch = await getCurrentBranch();

    console.log(chalk.blue('⚙ Current branch:'), chalk.yellow(currentBranch));

    // Determine prefix to use
    let prefix: string;

    if (options.prefix) {
      // Custom prefix provided
      prefix = options.prefix;
      console.log(chalk.blue('⚙ Using custom prefix:'), chalk.green(prefix));
    } else if (options.ticket) {
      // Ticket provided manually
      if (!isValidTicket(options.ticket)) {
        console.error(chalk.red(`✗ Invalid ticket format: ${options.ticket}`));
        console.error(chalk.gray('Expected format: ABC-123 (2-10 uppercase letters, dash, 2-10 numbers)'));
        process.exit(1);
      }
      prefix = options.ticket;
      console.log(chalk.blue('⚙ Using ticket:'), chalk.green(prefix));
    } else {
      // Try to extract from branch name
      const ticket = extractTicketFromBranch(currentBranch);

      if (!ticket) {
        console.error(chalk.red('✗ Unable to determine ticket number from branch name'));
        console.error(chalk.gray(`Branch name: ${currentBranch}`));
        console.error(chalk.gray('Expected format: feat/JIRA-123-description or JIRA-123-feature'));
        console.error(chalk.gray('\nUsage:'));
        console.error(chalk.cyan('  git-tag --ticket=JIRA-123'));
        console.error(chalk.cyan('  git-tag --prefix=CUSTOM_PREFIX'));
        process.exit(1);
      }

      prefix = ticket;
      console.log(chalk.blue('⚙ Detected ticket from branch:'), chalk.green(prefix));
    }

    // Check working directory is clean
    if (!await isClean()) {
      console.error(chalk.red('✗ Working directory has uncommitted changes'));
      console.error(chalk.gray('Please commit or stash your changes first'));
      process.exit(1);
    }

    // Check if branch has been pushed to remote
    const hasRemoteBranch = await hasRemote();
    if (hasRemoteBranch && !options.force && !options.dryRun) {
      console.error(chalk.red('✗ This branch has been pushed to remote'));
      console.error(chalk.yellow('\n⚠️  Rewriting history will require force-push!'));
      console.error(chalk.gray('\nThis will:'));
      console.error(chalk.gray('  • Change all commit hashes'));
      console.error(chalk.gray('  • Break the branch for anyone who has pulled it'));
      console.error(chalk.gray('  • Require: git push --force-with-lease\n'));
      console.error(chalk.cyan('To proceed anyway, use: --force'));
      console.error(chalk.gray('Example: git-tag --ticket=JIRA-123 --force\n'));
      process.exit(1);
    }

    // Get commits on current branch (excluding merges)
    console.log(chalk.blue('\n⚙ Fetching commits on current branch...'));
    const commits = await getBranchCommits();

    if (commits.length === 0) {
      console.log(chalk.yellow('⚠ No commits found on current branch'));
      process.exit(0);
    }

    const mergeCount = commits.filter(c => c.isMerge).length;
    console.log(chalk.blue(`Found ${commits.length} commit(s)`));
    if (mergeCount > 0) {
      console.log(chalk.gray(`(${mergeCount} merge commit(s) automatically skipped)`));
    }
    console.log('');

    // Check which commits need updating
    const commitsWithPrefix = commits.filter(commit => hasPrefix(commit.message));
    const commitsWithoutPrefix = commits.filter(commit => !hasPrefix(commit.message));

    // Determine which commits will be changed
    const commitsToUpdate = options.replace
      ? commits  // Replace mode: update all commits
      : commitsWithoutPrefix;  // Normal mode: only commits without prefix

    if (commitsToUpdate.length === 0) {
      console.log(chalk.green('✓ All commits already have ticket prefix!'));
      process.exit(0);
    }

    if (options.replace && commitsWithPrefix.length > 0) {
      console.log(chalk.yellow(`🔄 Replace mode: Will update all ${commits.length} commit(s)\n`));
    } else {
      console.log(chalk.yellow(`${commitsToUpdate.length} commit(s) need prefix:\n`));
    }

    // Show what will be changed (like rebase -i)
    console.log(chalk.bold('Commits to be rewritten:\n'));

    let commitNumber = 1;
    commits.forEach(commit => {
      const hasTicket = hasPrefix(commit.message);
      const willUpdate = options.replace || !hasTicket;

      console.log(chalk.gray(`Commit ${commitNumber} of ${commits.length} (${commit.shortHash})`));

      if (willUpdate) {
        let newMessage: string;
        if (hasTicket && options.replace) {
          // Replace existing ticket (from anywhere in message)
          const messageWithoutPrefix = commit.message.replace(/[A-Z]{2,10}-\d{2,10}\s*/, '');
          newMessage = formatCommitMessage(prefix, messageWithoutPrefix);
          console.log(chalk.yellow(`  ~ ${commit.message}`));
          console.log(chalk.green(`  → ${newMessage}`));
        } else {
          // Add new prefix
          newMessage = formatCommitMessage(prefix, commit.message);
          console.log(chalk.red(`  - ${commit.message}`));
          console.log(chalk.green(`  + ${newMessage}`));
        }
      } else {
        console.log(chalk.blue(`  ✓ ${commit.message} (already has prefix, skipped)`));
      }
      console.log('');
      commitNumber++;
    });

    if (options.dryRun) {
      console.log(chalk.blue('🔍 Dry run - no changes made'));
      process.exit(0);
    }

    // Ask for confirmation
    const confirm = require('@inquirer/confirm').default;
    const action = options.replace ? 'Replace/add prefix for' : 'Rewrite';
    const shouldRewrite = await confirm({
      message: `${action} ${commitsToUpdate.length} commit(s) with prefix "${prefix}"?`,
      default: false,
    });

    if (!shouldRewrite) {
      console.log(chalk.gray('Aborted'));
      process.exit(0);
    }

    // Import rewrite function
    const { rewriteCommitMessages, findBaseBranch } = require('./git-utils');

    // Perform the rewrite
    console.log(chalk.blue('\n⚙ Rewriting commits...'));
    const baseBranch = await findBaseBranch();
    await rewriteCommitMessages(baseBranch, prefix, options.replace || false);

    // Clean up backup refs
    console.log(chalk.blue('⚙ Cleaning up backup refs...'));
    await cleanupBackupRefs();

    console.log(chalk.green(`\n✓ Successfully rewrote ${commitsToUpdate.length} commit(s)!`));
    console.log(chalk.gray('\nUse git log to verify the changes'));

    if (hasRemoteBranch) {
      console.log(chalk.yellow('\n⚠️  Remember to force-push:'));
      console.log(chalk.cyan('  git push --force-with-lease\n'));
    }

    console.log(chalk.gray('To undo: git reflog and git reset --hard <commit>'));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('\n✗ Error:'), errorMessage);
    process.exit(1);
  }
}

main();
