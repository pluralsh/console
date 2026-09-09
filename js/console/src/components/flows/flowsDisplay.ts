import { DisplayView } from 'components/utils/display/DisplayPanel'
import { ServiceDeploymentStatus } from 'generated/graphql'
import { isEmpty, xor } from 'lodash'

export type FlowsView = DisplayView

export type FlowsSort = 'name' | 'serviceCount' | 'favorited'

export type FlowsSortDirection = 'asc' | 'desc'

export type FlowsDisplayState = {
  view: FlowsView
  statuses: ServiceDeploymentStatus[]
  sort: FlowsSort
  direction: FlowsSortDirection
}

export const FLOW_HEALTH_OPTIONS = [
  ServiceDeploymentStatus.Healthy,
  ServiceDeploymentStatus.Failed,
  ServiceDeploymentStatus.Stale,
] as const

export const DEFAULT_FLOWS_DISPLAY: FlowsDisplayState = {
  view: 'board',
  statuses: [...FLOW_HEALTH_OPTIONS],
  sort: 'name',
  direction: 'asc',
}

export function toggleListValue<T>(list: T[], value: T): T[] {
  return xor(list, [value])
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

export function toFlowFilterVariables({
  statuses,
}: Pick<FlowsDisplayState, 'statuses'>): {
  statuses?: ServiceDeploymentStatus[]
} {
  return {
    statuses: allFlowHealthSelected(statuses) ? undefined : statuses,
  }
}

export function parseFlowsView(value: unknown): FlowsView {
  return value === 'list' ? 'list' : 'board'
}

export function parseFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string')
}

export function sortFlows<
  T extends { id: string; name: string; serviceCount?: number | null },
>(
  flows: T[],
  { sort, direction }: Pick<FlowsDisplayState, 'sort' | 'direction'>,
  favoriteIds: string[]
): T[] {
  const favoriteSet = new Set(favoriteIds)
  const dir = direction === 'desc' ? -1 : 1

  return [...flows].sort((a, b) => {
    if (sort === 'favorited') {
      const fav = Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id))
      if (fav !== 0) return fav
      return a.name.localeCompare(b.name) * dir
    }

    const result =
      sort === 'serviceCount'
        ? (a.serviceCount ?? 0) - (b.serviceCount ?? 0)
        : a.name.localeCompare(b.name)

    return (result === 0 ? a.name.localeCompare(b.name) : result) * dir
  })
}
