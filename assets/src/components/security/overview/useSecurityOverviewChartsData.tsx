import {
  PolicyAggregate,
  usePolicyStatisticsQuery,
  useVulnerabilityStatisticsQuery,
  VulnerabilityStatistic,
  VulnReportGrade,
} from 'generated/graphql'
import { useMemo } from 'react'

import { CHART_COLOR_MAP } from 'components/utils/RadialBarChart'
import { POLL_INTERVAL } from '../policies/Policies'

export type SecurityChartDatum = {
  x: string
  y: number
  color: string
}
export type SecurityChartData = {
  id: string
  data: SecurityChartDatum[]
}[]

export function useSecurityOverviewChartsData(filters?: {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}) {
  const { error: clusterPolicyStatsError, ...clusterRes } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Cluster,
        ...filters,
      },
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL,
    })
  const clusterPolicyStats = clusterRes.data || clusterRes.previousData

  const { error: enforcementStatsError, ...enforcementRes } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Enforcement,
        ...filters,
      },
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL,
    })
  const enforcementStats = enforcementRes.data || enforcementRes.previousData

  const { error: vulnStatsError, ...vulnRes } = useVulnerabilityStatisticsQuery(
    {
      fetchPolicy: 'cache-and-network',
      pollInterval: POLL_INTERVAL,
    }
  )
  const vulnStats = (
    vulnRes.data || vulnRes.previousData
  )?.vulnerabilityStatistics?.filter(
    (stat): stat is VulnerabilityStatistic => stat !== null
  )

  const clusterPolicyChartData: SecurityChartData = useMemo(
    () =>
      !clusterPolicyStats?.policyStatistics
        ? []
        : [
            {
              id: 'cluster-violations',
              data: [
                {
                  x: 'Without violations',
                  y:
                    clusterPolicyStats?.policyStatistics?.find(
                      (stat) => stat?.aggregate === 'none'
                    )?.count ?? 0,
                  color: CHART_COLOR_MAP.green,
                },
                {
                  x: 'With violations',
                  y:
                    clusterPolicyStats?.policyStatistics?.find(
                      (stat) => stat?.aggregate === 'exists'
                    )?.count ?? 0,
                  color: CHART_COLOR_MAP.red,
                },
              ],
            },
          ],
    [clusterPolicyStats?.policyStatistics]
  )

  const enforcementChartData: SecurityChartData = useMemo(
    () =>
      !enforcementStats?.policyStatistics
        ? []
        : [
            {
              id: 'constraints-by-enforcement',
              data: [
                {
                  x: 'Dryrun',
                  y:
                    enforcementStats?.policyStatistics?.find(
                      (stat) => stat?.aggregate === 'dry_run'
                    )?.count ?? 0,
                  color: CHART_COLOR_MAP.green,
                },
                {
                  x: 'Warn',
                  y:
                    enforcementStats?.policyStatistics?.find(
                      (stat) => stat?.aggregate === 'warn'
                    )?.count ?? 0,
                  color: CHART_COLOR_MAP.yellow,
                },
                {
                  x: 'Deny',
                  y:
                    enforcementStats?.policyStatistics?.find(
                      (stat) => stat?.aggregate === 'deny'
                    )?.count ?? 0,
                  color: CHART_COLOR_MAP.red,
                },
              ],
            },
          ],
    [enforcementStats?.policyStatistics]
  )

  const vulnChartData: SecurityChartData = useMemo(
    () =>
      !vulnStats
        ? []
        : [
            {
              id: 'vulnerability-stats',
              data: vulnStats.map((stat) => ({
                x: stat?.grade,
                y: stat?.count,
                color: GRADE_COLOR_MAP[stat?.grade ?? VulnReportGrade.F],
              })),
            },
          ],
    [vulnStats]
  )

  return {
    clusterPolicyChartData,
    enforcementChartData,
    clusterPolicyStatsError,
    enforcementStatsError,
    vulnChartData,
    vulnStatsError,
  }
}

const GRADE_COLOR_MAP = {
  [VulnReportGrade.A]: CHART_COLOR_MAP.green,
  [VulnReportGrade.B]: CHART_COLOR_MAP['blue-light'],
  [VulnReportGrade.C]: CHART_COLOR_MAP.yellow,
  [VulnReportGrade.D]: CHART_COLOR_MAP.red,
  [VulnReportGrade.F]: CHART_COLOR_MAP['red-dark'],
}
