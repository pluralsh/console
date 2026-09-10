import { DisplayView } from 'components/utils/display/DisplayPanel'
import {
  FlowSort,
  FlowSortDirection,
  ServiceDeploymentStatus,
} from 'generated/graphql'
import { isEmpty, xor } from 'lodash'

export type FlowsView = DisplayView

export type FlowsDisplayState = {
  view: FlowsView
  statuses: ServiceDeploymentStatus[]
  sort: FlowSort
  direction: FlowSortDirection
}

export const FLOW_HEALTH_OPTIONS = [
  ServiceDeploymentStatus.Healthy,
  ServiceDeploymentStatus.Failed,
  ServiceDeploymentStatus.Stale,
] as const

export const DEFAULT_FLOWS_DISPLAY: FlowsDisplayState = {
  view: 'board',
  statuses: [...FLOW_HEALTH_OPTIONS],
  sort: FlowSort.Name,
  direction: FlowSortDirection.Asc,
}

export function allFlowHealthSelected(
  statuses: ServiceDeploymentStatus[]
): boolean {
  return isEmpty(xor(statuses, [...FLOW_HEALTH_OPTIONS]))
}

export function hasUncheckedFlowFilters({
  statuses,
}: Pick<FlowsDisplayState, 'statuses'>): boolean {
  return !allFlowHealthSelected(statuses)
}

export function getFlowFilterEmptyKind({
  statuses,
}: Pick<FlowsDisplayState, 'statuses'>): 'health' | null {
  if (isEmpty(statuses)) return 'health'
  return null
}

export function resetFlowFilters(state: FlowsDisplayState): FlowsDisplayState {
  return {
    ...state,
    statuses: DEFAULT_FLOWS_DISPLAY.statuses,
  }
}

export function toFlowFilterVariables(
  { statuses, sort, direction }: FlowsDisplayState,
  favoriteIds: string[]
): {
  statuses?: ServiceDeploymentStatus[]
  sort?: FlowSort
  direction?: FlowSortDirection
  favoriteIds?: string[]
} {
  const defaultSort =
    sort === FlowSort.Name && direction === FlowSortDirection.Asc

  return {
    statuses: allFlowHealthSelected(statuses) ? undefined : statuses,
    sort: defaultSort ? undefined : sort,
    direction: defaultSort ? undefined : direction,
    favoriteIds: sort === FlowSort.Favorited ? favoriteIds : undefined,
  }
}

export function parseFlowsView(value: unknown): FlowsView {
  return value === 'list' ? 'list' : 'board'
}

export function parseFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string')
}
