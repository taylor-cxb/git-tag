/**
 * Configuration for git-tag tool
 */

export interface GitTagConfig {
  // Regex pattern for ticket numbers (e.g., JIRA-123, NFOR-456)
  ticketPattern: RegExp;

  // Message format template
  // Variables: {prefix}, {message}
  messageFormat: string;

  // Branch name pattern to extract ticket number
  branchPattern: RegExp;
}

// Default configuration
export const DEFAULT_CONFIG: GitTagConfig = {
  // Matches: JIRA-123, NFOR-45, ABC-9999, etc. (anywhere in message)
  ticketPattern: /[A-Z]{2,10}-\d{2,10}/,

  // Message format: "JIRA-123 commit message"
  messageFormat: '{prefix} {message}',

  // Extract ticket from branch name: feat/JIRA-123-description
  branchPattern: /([A-Z]{2,10}-\d{2,10})/,
};

/**
 * Format a commit message with the given prefix
 */
export function formatCommitMessage(prefix: string, message: string, format?: string): string {
  const template = format || DEFAULT_CONFIG.messageFormat;

  return template
    .replace('{prefix}', prefix)
    .replace('{message}', message);
}

/**
 * Extract ticket number from branch name
 */
export function extractTicketFromBranch(branchName: string, pattern?: RegExp): string | null {
  const regex = pattern || DEFAULT_CONFIG.branchPattern;
  const match = branchName.match(regex);

  return match ? match[1] : null;
}

/**
 * Validate ticket format
 */
export function isValidTicket(ticket: string, pattern?: RegExp): boolean {
  const regex = pattern || DEFAULT_CONFIG.ticketPattern;
  return regex.test(ticket);
}

/**
 * Check if commit message contains a ticket (anywhere in message)
 */
export function hasPrefix(message: string, pattern?: RegExp): boolean {
  const regex = pattern || DEFAULT_CONFIG.ticketPattern;
  return regex.test(message);
}
