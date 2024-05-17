import { PieChartData } from 'components/utils/PieChart'
import { PolicyAggregate, usePolicyStatisticsQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useTheme } from 'styled-components'

import { POLL_INTERVAL } from './Policies'

export function usePolicyChartsData(filters: {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}) {
  const theme = useTheme()

  const { error: clusterPolicyStatsError, ...clusterRes } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Cluster,
        ...filters,
      },
      pollInterval: POLL_INTERVAL,
    })
  const clusterPolicyStats = clusterRes.data || clusterRes.previousData

  const { error: enforcementStatsError, ...enforcementRes } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Enforcement,
        ...filters,
      },
      pollInterval: POLL_INTERVAL,
    })
  const enforcementStats = enforcementRes.data || enforcementRes.previousData

  const { error: installedStatsError, ...installedRes } =
    usePolicyStatisticsQuery({
      variables: {
        aggregate: PolicyAggregate.Installed,
        ...filters,
      },
      pollInterval: POLL_INTERVAL,
    })
  const installedStats = installedRes.data || installedRes.previousData

  const clusterPolicyChartData: PieChartData | null = useMemo(
    () =>
      !clusterPolicyStats?.policyStatistics
        ? null
        : [
            {
              id: 'violations',
              label: 'with violations',
              color: theme.colors.semanticRedLight,
              value:
                clusterPolicyStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'exists'
                )?.count ?? 0,
            },
            {
              id: 'no-violations',
              label: 'without',
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
              label: 'dryrun',
              color: theme.colors.semanticGreen,
              value:
                enforcementStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'dry_run'
                )?.count ?? 0,
            },
            {
              id: 'deny',
              label: 'deny',
              color: theme.colors.semanticRedLight,
              value:
                enforcementStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'deny'
                )?.count ?? 0,
            },
            {
              id: 'warn',
              label: 'warn',
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
              label: 'uninstalled',
              color: theme.colors.semanticRedLight,
              value:
                installedStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'uninstalled'
                )?.count ?? 0,
            },
            {
              id: 'installed',
              label: 'installed',
              color: theme.colors.semanticGreen,
              value:
                installedStats?.policyStatistics?.find(
                  (stat) => stat?.aggregate === 'installed'
                )?.count ?? 0,
            },
          ],
    [
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
