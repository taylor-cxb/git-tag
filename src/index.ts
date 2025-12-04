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
} from './git-utils';

program
  .name('git-tag')
  .description('Add ticket prefixes to git commits on current branch')
  .version('1.0.0')
  .option('--ticket <ticket>', 'Manually specify ticket number (e.g., JIRA-123)')
  .option('--prefix <prefix>', 'Use custom prefix instead of ticket number')
  .option('--dry-run', 'Show what would be changed without modifying commits')
  .parse(process.argv);

const options = program.opts<{
  ticket?: string;
  prefix?: string;
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

    // Get commits on current branch
    console.log(chalk.blue('\n⚙ Fetching commits on current branch...'));
    const commits = await getBranchCommits();

    if (commits.length === 0) {
      console.log(chalk.yellow('⚠ No commits found on current branch'));
      process.exit(0);
    }

    console.log(chalk.blue(`Found ${commits.length} commit(s)\n`));

    // Check which commits need updating
    const commitsToUpdate = commits.filter(commit => !hasPrefix(commit.message));

    if (commitsToUpdate.length === 0) {
      console.log(chalk.green('✓ All commits already have ticket prefix!'));
      process.exit(0);
    }

    console.log(chalk.yellow(`${commitsToUpdate.length} commit(s) need prefix:\n`));

    // Show what will be changed
    commitsToUpdate.forEach(commit => {
      const shortHash = commit.hash.substring(0, 7);
      const newMessage = formatCommitMessage(prefix, commit.message);

      console.log(chalk.gray(`  ${shortHash}`));
      console.log(chalk.red(`  - ${commit.message}`));
      console.log(chalk.green(`  + ${newMessage}`));
      console.log('');
    });

    if (options.dryRun) {
      console.log(chalk.blue('🔍 Dry run - no changes made'));
      process.exit(0);
    }

    // TODO: Implement actual rewriting using git filter-branch or interactive rebase
    console.log(chalk.yellow('⚠ Commit rewriting not yet implemented'));
    console.log(chalk.gray('Use --dry-run to preview changes'));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('\n✗ Error:'), errorMessage);
    process.exit(1);
  }
}

main();
