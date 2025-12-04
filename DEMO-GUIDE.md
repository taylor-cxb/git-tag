# Demo Recording Guide

This guide helps you record a demo showing the git-tag workflow.

## Setup

**Important**: Run these commands from a project directory with a feature branch (e.g., `~/Projects/nform`), NOT from the git-tag tool directory.

**Prerequisites**: You'll need a branch with unprefixed commits. Branch name should contain a ticket number like `feat/JIRA-123-new-feature`.

## Recording with asciinema

```bash
# Navigate to your project directory
cd ~/Projects/nform  # or any repo with a feature branch

# Create a demo branch if needed
git checkout -b feat/JIRA-123-demo-feature

# Make some commits without prefixes (if needed)
git commit -m "Add feature" --allow-empty
git commit -m "Fix bug" --allow-empty
git commit -m "Update docs" --allow-empty

# Start recording
asciinema rec ~/Utils/git-tag/demo.cast --overwrite

# Follow the script below...
# When done, press Ctrl+D

# Convert to GIF (run from git-tag directory)
cd ~/Utils/git-tag
agg demo.cast demo.gif --speed 1.5 --font-size 16

# Or use full paths from your project directory
agg ~/Utils/git-tag/demo.cast ~/Utils/git-tag/demo.gif --speed 1.5 --font-size 16
```

## Demo Script

### 1. Show current branch
```bash
git branch --show-current
```
*Expected output: `feat/JIRA-123-demo-feature` (or similar with ticket)*

### 2. Show commit history WITHOUT prefixes
```bash
git log --oneline -3
```
*Expected output: Commits without JIRA-123 prefix*

### 3. Show what git-tag will do (dry run)
```bash
git-tag --dry-run
```
*Shows preview of changes*

### 4. Run git-tag to add prefixes
```bash
git-tag
```
*Auto-detects JIRA-123 from branch name and updates commits*

### 5. Show updated commit history WITH prefixes
```bash
git log --oneline -3
```
*Expected output: All commits now have `JIRA-123` prefix*

### 6. Show the diff in commit message format
```bash
git log --format="%s" -3
```
*Shows clean commit subject lines with prefixes*

### 7. Stop recording
Press `Ctrl+D`

## Alternative: Manual Ticket Demo

If you want to show manual ticket specification:

```bash
# Show commits without prefix
git log --oneline -3

# Add custom ticket
git-tag --ticket=CUSTOM-999

# Show updated commits
git log --oneline -3
```

## Tips

- **Keep it short**: Aim for 30-60 seconds
- **Slow down**: Type slower than normal so viewers can follow
- **Clear terminal**: Run `clear` before starting
- **Use a real branch**: Record in a repo with actual unprefixed commits
- **Font size**: Use a larger terminal font (16-18pt) for readability
- **Show the diff**: Use `git log --oneline` to clearly show before/after
- **Branch naming**: Make sure your branch has a recognizable ticket pattern (e.g., JIRA-123)

## VHS Alternative

If you prefer using VHS (charmbracelet/vhs) instead of asciinema:

```bash
vhs demo.tape
```

This will generate the GIF directly from the tape file.
