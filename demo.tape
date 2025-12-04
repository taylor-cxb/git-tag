# VHS documentation: https://github.com/charmbracelet/vhs
#
# This script demonstrates the git-tag workflow
#
Output demo.gif

Set Shell "bash"
Set FontSize 16
Set Width 1400
Set Height 700
Set Padding 20
Set Theme "Dracula"

# Show current branch with ticket number
Type "# Start on a feature branch with a ticket number"
Enter
Sleep 500ms
Type "git branch --show-current"
Enter
Sleep 2s

# Show commits WITHOUT prefixes
Type "# Show current commits (no ticket prefixes)"
Enter
Sleep 500ms
Type "git log --oneline -3"
Enter
Sleep 3s

# Show dry run
Type "# Preview what git-tag will do"
Enter
Sleep 500ms
Type "git-tag --dry-run"
Enter
Sleep 3s

# Run git-tag
Type "# Now add ticket prefixes to all commits"
Enter
Sleep 500ms
Type "git-tag"
Enter
Sleep 2s

# Show commits WITH prefixes
Type "# Check the updated commit messages"
Enter
Sleep 500ms
Type "git log --oneline -3"
Enter
Sleep 3s

# Show formatted commit messages
Type "# All commits now have the JIRA ticket prefix"
Enter
Sleep 500ms
Type "git log --format='%s' -3"
Enter
Sleep 3s

# End
Sleep 1s
