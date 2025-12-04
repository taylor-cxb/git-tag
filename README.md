# git-tag

Automatically add ticket prefixes (JIRA-123, NFOR-456, etc.) to git commits on your current branch.

## Features

- 🎯 **Auto-detect ticket** from branch name
- ✏️ **Manual ticket** specification with `--ticket`
- 🔧 **Custom prefixes** with `--prefix`
- 🛡️ **Commit enforcement** via git hook
- ⚙️ **Configurable format** in `src/config.ts`
- 🔒 **Safety protections**:
  - Automatically skips merge commits
  - Warns if branch has been pushed to remote
  - Cleans up git filter-branch backup refs
  - Requires `--force` flag for pushed branches

## Installation

```bash
cd ~/Utils/git-tag
npm install
npm run build
npm link  # Install globally
```

## Usage

### Auto-detect from branch name

```bash
# On branch: feat/JIRA-123-add-feature
git-tag

# Detects JIRA-123 and adds to all commits
```

### Manual ticket number

```bash
git-tag --ticket=JIRA-123
```

### Custom prefix

```bash
git-tag --prefix=RELEASE_V2
```

### Dry run

```bash
git-tag --dry-run
# Shows what would change without modifying commits
```

## Commit Message Enforcement

Install the git hook to enforce ticket prefixes:

```bash
# In your project repository
cp ~/Utils/git-tag/hooks/commit-msg .git/hooks/
chmod +x .git/hooks/commit-msg
```

Now commits without prefixes will be rejected:

```bash
git commit -m "Add feature"
# ❌ Rejected: Missing ticket prefix

git commit -m "JIRA-123 Add feature"
# ✅ Accepted
```

## Configuration

Edit `src/config.ts` to customize:

```typescript
export const DEFAULT_CONFIG = {
  // Ticket pattern (2-10 caps, dash, 2-10 numbers)
  ticketPattern: /^[A-Z]{2,10}-\d{2,10}$/,

  // Message format
  messageFormat: '{prefix} {message}',

  // Branch pattern to extract ticket
  branchPattern: /([A-Z]{2,10}-\d{2,10})/,
};
```

## Examples

```bash
# Branch: feat/NFOR-110-integration
git-tag
# Output: Detected NFOR-110, updated 3 commits

# Manual ticket
git-tag --ticket=JIRA-456
# Output: Using JIRA-456, updated 5 commits

# Custom prefix (non-ticket use case)
git-tag --prefix=HOTFIX_PROD
# Output: Using HOTFIX_PROD, updated 2 commits
```

## How It Works

1. **Detects current branch** and extracts ticket number
2. **Finds commits** on current branch since divergence from main
3. **Automatically skips merge commits** to avoid rewriting merges
4. **Checks for remote** - warns if branch has been pushed
5. **Checks each commit** message for existing prefix
6. **Rewrites commits** without prefix to add it
7. **Cleans up backup refs** after successful rewrite

## Safety Features

### 1. Merge Commit Protection
Merge commits are automatically skipped and never rewritten:
```bash
✓ Merge branch 'main' into feat/branch (skipped)
```

### 2. Remote Branch Warning
If your branch has been pushed, the tool requires `--force`:
```bash
✗ This branch has been pushed to remote
⚠️  Rewriting history will require force-push!

To proceed: git-tag --ticket=JIRA-123 --force
```

### 3. Automatic Cleanup
Backup refs created by git filter-branch are automatically removed after success.

### 4. Clear Instructions
The tool reminds you to force-push if the branch has a remote.

## Best Practices

1. **Use before first push** (safest)
   ```bash
   git commit -m "fix bug"
   git-tag  # Add prefixes
   git push  # Push once with clean history
   ```

2. **Don't use after merging main**
   - Tool skips merge commits, but creates complexity
   - Better: Tag before merging

3. **Use --force carefully**
   - Only when you understand the implications
   - Communicate with team if others have the branch

## Roadmap

- [x] Commit rewriting with git filter-branch
- [x] Skip merge commits automatically
- [x] Warn about remote branches
- [x] Clean up backup refs
- [ ] Support for multiple ticket formats
- [ ] Integration with Husky

## License

MIT
