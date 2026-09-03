import { IssueStatus } from 'generated/graphql'
import { groupBy, isNil } from 'lodash'

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
  const grouped = groupBy(
    issues.filter((issue) => !isNil(issue.status)),
    (issue) => issue.status as IssueStatus
  )

  return {
    [IssueStatus.Open]: grouped[IssueStatus.Open] ?? [],
    [IssueStatus.InProgress]: grouped[IssueStatus.InProgress] ?? [],
    [IssueStatus.Completed]: grouped[IssueStatus.Completed] ?? [],
    [IssueStatus.Cancelled]: grouped[IssueStatus.Cancelled] ?? [],
  }
}
