import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'

export type WorkbenchIssuesView = 'list' | 'board'

export type WorkbenchIssuesDisplayState = {
  view: WorkbenchIssuesView
  providers: IssueWebhookProvider[]
  statuses: IssueStatus[]
  sort: IssueSort
  direction: IssueSortDirection
}

export const ALL_ISSUE_PROVIDERS = Object.values(IssueWebhookProvider)

export const PINNED_ISSUE_PROVIDERS = [
  IssueWebhookProvider.Github,
  IssueWebhookProvider.Linear,
]

export const ISSUE_STATUS_OPTIONS = [
  IssueStatus.Open,
  IssueStatus.InProgress,
  IssueStatus.Completed,
  IssueStatus.Cancelled,
] as const

export const DEFAULT_WORKBENCH_ISSUES_DISPLAY: WorkbenchIssuesDisplayState = {
  view: 'list',
  providers: ALL_ISSUE_PROVIDERS,
  statuses: [...ISSUE_STATUS_OPTIONS],
  sort: IssueSort.InsertedAt,
  direction: IssueSortDirection.Desc,
}

export function toggleListValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value]
}

export function visibleIssueProviders(
  counts: Partial<Record<IssueWebhookProvider, number>>
): IssueWebhookProvider[] {
  const extras = ALL_ISSUE_PROVIDERS.filter(
    (provider) =>
      !PINNED_ISSUE_PROVIDERS.includes(provider) && (counts[provider] ?? 0) > 0
  )

  return [...PINNED_ISSUE_PROVIDERS, ...extras]
}

export function toIssueFilterVariables({
  providers,
  statuses,
  sort,
  direction,
}: WorkbenchIssuesDisplayState): {
  providers?: IssueWebhookProvider[]
  statuses?: IssueStatus[]
  sort?: IssueSort
  direction?: IssueSortDirection
} {
  const allProvidersSelected =
    providers.length === ALL_ISSUE_PROVIDERS.length &&
    ALL_ISSUE_PROVIDERS.every((provider) => providers.includes(provider))
  const allStatusesSelected =
    statuses.length === ISSUE_STATUS_OPTIONS.length &&
    ISSUE_STATUS_OPTIONS.every((status) => statuses.includes(status))
  const defaultSort =
    sort === IssueSort.InsertedAt && direction === IssueSortDirection.Desc

  return {
    providers: allProvidersSelected ? undefined : providers,
    statuses: allStatusesSelected ? undefined : statuses,
    sort: defaultSort ? undefined : sort,
    direction: defaultSort ? undefined : direction,
  }
}
