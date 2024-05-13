import { PieChartData } from 'components/utils/PieChart'
import { PolicyAggregate, usePolicyStatisticsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

export function usePolicyChartsData(filters: {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}) {
  const theme = useTheme()
  const { data: clusterPolicyStats, error: clusterPolicyStatsError } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Cluster,
        ...filters,
      },
    })
  const { data: enforcementStats, error: enforcementStatsError } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Enforcement,
        ...filters,
      },
    })
  const { data: installedStats, error: installedStatsError } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Installed,
        ...filters,
      },
    })

  const clusterPolicyChartData: PieChartData | null = useMemo(
    () =>
      !clusterPolicyStats?.policyStatistics
        ? null
        : [
            {
              id: 'violations',
              label: 'WITH VIOLATIONS',
              color: theme.colors.semanticRedLight,
              value:
                clusterPolicyStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'exists'
                )?.count ?? 0,
            },
            {
              id: 'no-violations',
              label: 'WITHOUT',
              color: theme.colors.semanticGreen,
              value:
                clusterPolicyStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'none'
                )?.count ?? 0,
            },
          ],
    [
      clusterPolicyStats?.policyStatistics,
      theme.colors.semanticGreen,
      theme.colors.semanticRedLight,
    ]
  )

  const enforcementChartData: PieChartData | null = useMemo(
    () =>
      !enforcementStats?.policyStatistics
        ? null
        : [
            {
              id: 'dryrun',
              label: 'DRYRUN',
              color: theme.colors.semanticGreen,
              value:
                enforcementStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'dry_run'
                )?.count ?? 0,
            },
            {
              id: 'deny',
              label: 'DENY',
              color: theme.colors.semanticRedLight,
              value:
                enforcementStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'deny'
                )?.count ?? 0,
            },
            {
              id: 'warn',
              label: 'WARN',
              color: theme.colors.semanticYellow,
              value:
                enforcementStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'warn'
                )?.count ?? 0,
            },
          ],
    [
      enforcementStats?.policyStatistics,
      theme.colors.semanticGreen,
      theme.colors.semanticRedLight,
      theme.colors.semanticYellow,
    ]
  )
  const installedChartData: PieChartData | null = useMemo(
    () =>
      !installedStats?.policyStatistics
        ? null
        : [
            {
              id: 'uninstalled',
              label: 'UNINSTALLED',
              color: theme.colors.semanticRedLight,
              value:
                clusterPolicyStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'none'
                )?.count ?? 0,
            },
            {
              id: 'installed',
              label: 'INSTALLED',
              color: theme.colors.semanticGreen,
              value:
                clusterPolicyStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'exists'
                )?.count ?? 0,
            },
          ],
    [
      clusterPolicyStats?.policyStatistics,
      installedStats?.policyStatistics,
      theme.colors.semanticGreen,
      theme.colors.semanticRedLight,
    ]
  )

  return {
    clusterPolicyChartData,
    enforcementChartData,
    installedChartData,
    clusterPolicyStatsError,
    enforcementStatsError,
    installedStatsError,
  }
}
