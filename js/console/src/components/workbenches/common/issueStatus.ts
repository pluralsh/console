import { IssueStatus } from 'generated/graphql'

export const ISSUE_STATUS_OPTIONS = [
  IssueStatus.Open,
  IssueStatus.InProgress,
  IssueStatus.Completed,
  IssueStatus.Cancelled,
] as const

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  [IssueStatus.Open]: 'Open',
  [IssueStatus.InProgress]: 'In progress',
  [IssueStatus.Completed]: 'Completed',
  [IssueStatus.Cancelled]: 'Cancelled',
}

export function groupIssuesByStatus<
  T extends { status?: Nullable<IssueStatus> },
>(issues: T[]): Record<IssueStatus, T[]> {
  const grouped: Record<IssueStatus, T[]> = {
    [IssueStatus.Open]: [],
    [IssueStatus.InProgress]: [],
    [IssueStatus.Completed]: [],
    [IssueStatus.Cancelled]: [],
  }

  for (const issue of issues) {
    if (issue.status) grouped[issue.status].push(issue)
  }

  return grouped
}
