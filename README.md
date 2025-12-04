# git-tag

Automatically add ticket prefixes (JIRA-123, NFOR-456, etc.) to git commits on your current branch.

## Features

- 🎯 **Auto-detect ticket** from branch name
- ✏️ **Manual ticket** specification with `--ticket`
- 🔧 **Custom prefixes** with `--prefix`
- 🛡️ **Commit enforcement** via git hook
- ⚙️ **Configurable format** in `src/config.ts`

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

### Replace existing prefixes

```bash
# Fix incorrect ticket numbers
git-tag --ticket=JIRA-124 --replace

# Before: TOOL-123 fix bug in validation
# After:  JIRA-124 fix bug in validation
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
3. **Checks each commit** message for existing prefix
4. **Rewrites commits** without prefix to add it

## Roadmap

- [ ] Implement commit rewriting (currently shows preview only)
- [ ] Support for multiple ticket formats
- [ ] Integration with Husky
- [ ] Interactive mode to review each commit

## License

MIT
