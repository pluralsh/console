import { Button, CaretUpIcon, Flex } from '@pluralsh/design-system'
import { SimpleAccordion } from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { ClusterHealthScoresHeatmap } from 'components/home/clusteroverview/ClusterHealthScoresHeatmap'
import {
  ClusterUpgradesChart,
  UpgradeChartFilter,
} from 'components/home/clusteroverview/ClusterUpgradesChart'
import { Body1BoldP } from 'components/utils/typography/Text'
import {
  useClusterHealthScoresQuery,
  useUpgradeStatisticsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

export function ClustersCharts({
  show,
  setShow,
}: {
  show: boolean
  setShow: (show: boolean) => void
}) {
  const { spacing } = useTheme()

  return (
    <SimpleAccordion
      trigger={undefined}
      defaultOpen={show}
      isOpen={show}
      setIsOpen={setShow}
      loading={false}
      accordionStyles={{
        marginTop: show ? 0 : -spacing.small,
        position: 'relative',
      }}
    >
      <Button
        small
        tertiary
        startIcon={<CaretUpIcon />}
        onClick={() => setShow(false)}
        css={{
          position: 'absolute',
          top: spacing.medium,
          right: spacing.large,
        }}
      >
        Hide charts
      </Button>
      <ClusterChartsContent />
    </SimpleAccordion>
  )
}

function ClusterChartsContent() {
  const projectId = useProjectId()

  const { data: healthScoresData } = useClusterHealthScoresQuery({
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const {
    data: upgradeData,
    loading: upgradeLoading,
    error: upgradeError,
  } = useUpgradeStatisticsQuery({
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const clusters = useMemo(
    () => mapExistingNodes(healthScoresData?.clusters),
    [healthScoresData?.clusters]
  )

  return (
    <Flex height={320}>
      <ChartCellSC $side="left">
        <Body1BoldP>Health scores</Body1BoldP>
        <ClusterHealthScoresHeatmap
          showLegend
          clusters={clusters}
          onClick={() => {}}
        />
      </ChartCellSC>
      <ChartCellSC $side="right">
        <Body1BoldP css={{ flex: 1 }}>Upgrades</Body1BoldP>
        <ClusterUpgradesChart
          showLegend
          data={upgradeData}
          loading={upgradeLoading}
          error={upgradeError}
          selectedFilter={UpgradeChartFilter.All}
          onClick={() => {}}
        />
      </ChartCellSC>
    </Flex>
  )
}

const ChartCellSC = styled.div<{ $side?: 'left' | 'right' }>(
  ({ theme, $side }) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
    flex: 1,
    border: theme.borders.default,
    borderRadius:
      $side === 'left'
        ? `${theme.borderRadiuses.large}px 0 0 ${theme.borderRadiuses.large}px`
        : `0 ${theme.borderRadiuses.large}px ${theme.borderRadiuses.large}px 0`,
    padding: theme.spacing.medium,
    height: '100%',
    ...($side === 'right' && { borderLeft: 'none' }),
  })
)
