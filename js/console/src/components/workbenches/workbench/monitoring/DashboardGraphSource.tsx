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
import { createContext, ReactNode, use, useMemo } from 'react'

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

type DashboardGraphSource = {
  useGraphData: (args: GraphDataArgs) => GraphDataResult
  readOnly: boolean
}

const DashboardGraphSourceContext = createContext<DashboardGraphSource | null>(
  null
)

export function DashboardGraphSourceProvider({
  useGraphData,
  readOnly,
  children,
}: DashboardGraphSource & { children: ReactNode }) {
  const value = useMemo(
    () => ({ useGraphData, readOnly }),
    [useGraphData, readOnly]
  )

  return (
    <DashboardGraphSourceContext value={value}>
      {children}
    </DashboardGraphSourceContext>
  )
}

export function useDashboardGraphSource() {
  const source = use(DashboardGraphSourceContext)
  if (!source)
    throw new Error(
      'useDashboardGraphSource must be used within a DashboardGraphSourceProvider'
    )
  return source
}

export function AuthenticatedGraphSource({
  dashboardId,
  children,
}: {
  dashboardId: string
  children: ReactNode
}) {
  const useGraphData = useMemo(
    () =>
      function useAuthenticatedGraphData({
        identifier,
        variables,
        timeRange,
        skip,
      }: GraphDataArgs): GraphDataResult {
        const { data, previousData, loading, error } =
          useWorkbenchDashboardGraphQuery({
            variables: {
              id: dashboardId,
              identifier,
              input: JSON.stringify(variables),
              timeRange,
            },
            skip,
            fetchPolicy: GRAPH_FETCH_POLICY,
          })
        return {
          data: data?.workbenchDashboard?.graph ?? undefined,
          previousData: previousData?.workbenchDashboard?.graph ?? undefined,
          loading,
          error,
        }
      },
    [dashboardId]
  )

  return (
    <DashboardGraphSourceProvider
      useGraphData={useGraphData}
      readOnly={false}
    >
      {children}
    </DashboardGraphSourceProvider>
  )
}

export function PublicGraphSource({
  publicId,
  children,
}: {
  publicId: string
  children: ReactNode
}) {
  // public graphs ignore variables; the backend applies input defaults
  const useGraphData = useMemo(
    () =>
      function usePublicGraphData({
        identifier,
        timeRange,
        skip,
      }: GraphDataArgs): GraphDataResult {
        const { data, previousData, loading, error } =
          usePublicWorkbenchDashboardGraphQuery({
            client: authlessClient,
            variables: { publicId, identifier, timeRange },
            skip,
            fetchPolicy: GRAPH_FETCH_POLICY,
          })
        return {
          data: data?.publicWorkbenchDashboard?.graph ?? undefined,
          previousData:
            previousData?.publicWorkbenchDashboard?.graph ?? undefined,
          loading,
          error,
        }
      },
    [publicId]
  )

  return (
    <DashboardGraphSourceProvider
      useGraphData={useGraphData}
      readOnly
    >
      {children}
    </DashboardGraphSourceProvider>
  )
}

export function toPanelGraph(
  graph: WorkbenchDashboardGraph
): DashboardPanelGraph {
  return { ...graph, hasDatasource: !!graph.datasource }
}
