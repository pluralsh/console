import {
  IssueSort,
  IssueSortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { intersection, isEmpty, xor } from 'lodash'
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

export const DEFAULT_WORKBENCH_ISSUES_DISPLAY: WorkbenchIssuesDisplayState = {
  view: 'list',
  providers: ALL_ISSUE_PROVIDERS,
  statuses: [...ISSUE_STATUS_OPTIONS],
  sort: IssueSort.InsertedAt,
  direction: IssueSortDirection.Desc,
}

export function toggleListValue<T>(list: T[], value: T): T[] {
  return xor(list, [value])
}

export function visibleIssueProviders(
  counts: Partial<Record<IssueWebhookProvider, number>>
): IssueWebhookProvider[] {
  return ALL_ISSUE_PROVIDERS.filter((provider) => (counts[provider] ?? 0) > 0)
}

export function allIssueProvidersSelected(
  providers: IssueWebhookProvider[]
): boolean {
  return isEmpty(xor(providers, ALL_ISSUE_PROVIDERS))
}

export function allIssueStatusesSelected(statuses: IssueStatus[]): boolean {
  return isEmpty(xor(statuses, ISSUE_STATUS_OPTIONS))
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
  if (
    !isEmpty(visibleProviders) &&
    isEmpty(intersection(visibleProviders, providers))
  ) {
    return 'sources'
  }
  if (isEmpty(statuses)) return 'statuses'
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
