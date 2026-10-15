import {
  allSelected,
  DisplayView,
  filterVariable,
} from 'components/utils/display/DisplayPanel'
import {
  IssueSort,
  SortDirection,
  IssueStatus,
  IssueWebhookProvider,
} from 'generated/graphql'
import { intersection, isEmpty } from 'lodash'
import { ISSUE_STATUS_OPTIONS } from 'components/workbenches/common/issueStatus'

export type WorkbenchIssuesDisplayState = {
  view: DisplayView
  providers: IssueWebhookProvider[]
  statuses: IssueStatus[]
  sort: IssueSort
  direction: SortDirection
}

const ALL_ISSUE_PROVIDERS = Object.values(IssueWebhookProvider)

export const DEFAULT_WORKBENCH_ISSUES_DISPLAY: WorkbenchIssuesDisplayState = {
  view: 'list',
  providers: ALL_ISSUE_PROVIDERS,
  statuses: [...ISSUE_STATUS_OPTIONS],
  sort: IssueSort.InsertedAt,
  direction: SortDirection.Desc,
}

export function visibleIssueProviders(
  counts: Partial<Record<IssueWebhookProvider, number>>
): IssueWebhookProvider[] {
  return ALL_ISSUE_PROVIDERS.filter((provider) => (counts[provider] ?? 0) > 0)
}

export function hasUncheckedIssueFilters({
  providers,
  statuses,
}: Pick<WorkbenchIssuesDisplayState, 'providers' | 'statuses'>): boolean {
  return (
    !allSelected(providers, ALL_ISSUE_PROVIDERS) ||
    !allSelected(statuses, ISSUE_STATUS_OPTIONS)
  )
}

type IssueFilterEmptyKind = 'sources' | 'statuses'

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
  direction?: SortDirection
} {
  const defaultSort =
    sort === IssueSort.InsertedAt && direction === SortDirection.Desc

  return {
    providers: filterVariable(providers, ALL_ISSUE_PROVIDERS),
    statuses: filterVariable(statuses, ISSUE_STATUS_OPTIONS),
    sort: defaultSort ? undefined : sort,
    direction: defaultSort ? undefined : direction,
  }
}
