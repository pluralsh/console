import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { ISSUE_STATUS_OPTIONS } from 'components/workbenches/common/issueStatus'

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

export function allIssueProvidersSelected(
  providers: IssueWebhookProvider[]
): boolean {
  return (
    providers.length === ALL_ISSUE_PROVIDERS.length &&
    ALL_ISSUE_PROVIDERS.every((provider) => providers.includes(provider))
  )
}

export function allIssueStatusesSelected(statuses: IssueStatus[]): boolean {
  return (
    statuses.length === ISSUE_STATUS_OPTIONS.length &&
    ISSUE_STATUS_OPTIONS.every((status) => statuses.includes(status))
  )
}

export function hasUncheckedIssueFilters({
  providers,
  statuses,
}: Pick<WorkbenchIssuesDisplayState, 'providers' | 'statuses'>): boolean {
  return (
    !allIssueProvidersSelected(providers) || !allIssueStatusesSelected(statuses)
  )
}

export type IssueFilterEmptyKind = 'sources' | 'statuses'

export function getIssueFilterEmptyKind(
  {
    providers,
    statuses,
  }: Pick<WorkbenchIssuesDisplayState, 'providers' | 'statuses'>,
  visibleProviders: IssueWebhookProvider[]
): IssueFilterEmptyKind | null {
  if (visibleProviders.every((provider) => !providers.includes(provider))) {
    return 'sources'
  }
  if (statuses.length === 0) return 'statuses'
  return null
}

export function resetIssueFilters(
  state: WorkbenchIssuesDisplayState
): WorkbenchIssuesDisplayState {
  return {
    ...state,
    providers: DEFAULT_WORKBENCH_ISSUES_DISPLAY.providers,
    statuses: DEFAULT_WORKBENCH_ISSUES_DISPLAY.statuses,
  }
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
  const defaultSort =
    sort === IssueSort.InsertedAt && direction === IssueSortDirection.Desc

  return {
    providers: allIssueProvidersSelected(providers) ? undefined : providers,
    statuses: allIssueStatusesSelected(statuses) ? undefined : statuses,
    sort: defaultSort ? undefined : sort,
    direction: defaultSort ? undefined : direction,
  }
}
