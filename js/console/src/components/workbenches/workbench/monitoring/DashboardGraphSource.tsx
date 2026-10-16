import { ApolloError } from '@apollo/client'
import {
  DashboardTimeRangeAttributes,
  PublicWorkbenchDashboardGraphFragment,
  usePublicWorkbenchDashboardGraphQuery,
  useWorkbenchDashboardGraphQuery,
  WorkbenchDashboardDetailsFragment,
  WorkbenchDashboardGraphQuery,
} from 'generated/graphql'
import { authlessClient } from 'helpers/client'
import { createContext, ReactNode, use } from 'react'

type WorkbenchDashboardGraph = NonNullable<
  NonNullable<WorkbenchDashboardDetailsFragment['graphs']>[number]
>

/** The graph fields shared by authenticated and public dashboards. */
export type DashboardPanelGraph = Pick<
  PublicWorkbenchDashboardGraphFragment,
  | 'identifier'
  | 'title'
  | 'description'
  | 'type'
  | 'unit'
  | 'sectionId'
  | 'markdown'
  | 'options'
  | 'layout'
> & {
  hasDatasource: boolean
  // authenticated only, for the query modal
  datasource?: WorkbenchDashboardGraph['datasource']
  workbenchTool?: WorkbenchDashboardGraph['workbenchTool']
}

type GraphResult = NonNullable<
  NonNullable<WorkbenchDashboardGraphQuery['workbenchDashboard']>['graph']
>

export type GraphDataResult = {
  data?: GraphResult
  previousData?: GraphResult
  loading: boolean
  error?: ApolloError
}

export type GraphDataArgs = {
  identifier: string
  variables: Record<string, string>
  timeRange: DashboardTimeRangeAttributes
  skip: boolean
}

// time-windowed series rarely hit the cache, and caching every panel's points
// on the shared dashboard entity makes each response re-diff the others
const GRAPH_FETCH_POLICY = 'no-cache'

type DashboardGraphSource =
  | { dashboardId: string; publicId?: never; readOnly: false }
  | { publicId: string; dashboardId?: never; readOnly: true }

const DashboardGraphSourceContext = createContext<DashboardGraphSource | null>(
  null
)

export function useDashboardGraphSource() {
  const source = use(DashboardGraphSourceContext)
  if (!source)
    throw new Error(
      'useDashboardGraphSource must be used within a DashboardGraphSourceProvider'
    )
  return source
}

// Runs the authenticated or the public graph query, depending on the source.
export function useGraphData({
  identifier,
  variables,
  timeRange,
  skip,
}: GraphDataArgs): GraphDataResult {
  const { dashboardId, publicId } = useDashboardGraphSource()
  const authenticated = useWorkbenchDashboardGraphQuery({
    variables: {
      id: dashboardId ?? '',
      identifier,
      input: JSON.stringify(variables),
      timeRange,
    },
    skip: skip || !dashboardId,
    fetchPolicy: GRAPH_FETCH_POLICY,
  })
  // public graphs ignore variables; the backend applies input defaults
  const publicGraph = usePublicWorkbenchDashboardGraphQuery({
    client: authlessClient,
    variables: { publicId: publicId ?? '', identifier, timeRange },
    skip: skip || !publicId,
    fetchPolicy: GRAPH_FETCH_POLICY,
  })

  if (publicId) {
    const { data, previousData, loading, error } = publicGraph
    return {
      data: data?.publicWorkbenchDashboard?.graph ?? undefined,
      previousData: previousData?.publicWorkbenchDashboard?.graph ?? undefined,
      loading,
      error,
    }
  }

  const { data, previousData, loading, error } = authenticated
  return {
    data: data?.workbenchDashboard?.graph ?? undefined,
    previousData: previousData?.workbenchDashboard?.graph ?? undefined,
    loading,
    error,
  }
}

export function AuthenticatedGraphSource({
  dashboardId,
  children,
}: {
  dashboardId: string
  children: ReactNode
}) {
  return (
    <DashboardGraphSourceContext value={{ dashboardId, readOnly: false }}>
      {children}
    </DashboardGraphSourceContext>
  )
}

export function PublicGraphSource({
  publicId,
  children,
}: {
  publicId: string
  children: ReactNode
}) {
  return (
    <DashboardGraphSourceContext value={{ publicId, readOnly: true }}>
      {children}
    </DashboardGraphSourceContext>
  )
}

export function toPanelGraph(
  graph: WorkbenchDashboardGraph
): DashboardPanelGraph {
  return { ...graph, hasDatasource: !!graph.datasource }
}
