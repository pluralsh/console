import { ApolloError } from '@apollo/client'
import {
  Card,
  EmptyState,
  Flex,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useClusterHeatmapData } from 'components/cd/cluster/ClusterMetrics'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'
import { HeatMapFlavor, MetricPointResponseFragment } from 'generated/graphql'
import { capitalize, isEmpty } from 'lodash'
import { ReactNode, useState } from 'react'
import { useTheme } from 'styled-components'

const HEATMAP_HEIGHT = 320

export function OverviewHeatmaps({ clusterId }: { clusterId: string }) {
  const metricsEnabled = useMetricsEnabled()
  const [heatMapFlavor, setHeatMapFlavor] = useState<HeatMapFlavor>(
    HeatMapFlavor.Node
  )

  const heatmapData = useClusterHeatmapData({
    clusterId,
    fetchNoisyNeighbors: true,
    fetchUtilization: true,
    utilizationFlavor: heatMapFlavor,
  })

  if (!metricsEnabled) return null

  const hasUtilData =
    !isEmpty(heatmapData.utilCpuHeatMap) ||
    !isEmpty(heatmapData.utilMemoryHeatMap)
  const hasNnData =
    !isEmpty(heatmapData.noisyCpuHeatMap) ||
    !isEmpty(heatmapData.noisyMemoryHeatMap)

  return (
    <Flex gap="large">
      <HeatmapPair
        title="Memory & CPU utliization"
        flavor={heatMapFlavor}
        action={
          <Flex
            gap="small"
            align="center"
            textWrap="nowrap"
          >
            <CaptionP $color="text-xlight">Group by</CaptionP>
            <Select
              width={160}
              selectedKey={heatMapFlavor}
              onSelectionChange={(e) => setHeatMapFlavor(e as HeatMapFlavor)}
            >
              {Object.values(HeatMapFlavor).map((flavor) => (
                <ListBoxItem
                  key={flavor}
                  label={capitalize(flavor)}
                />
              ))}
            </Select>
          </Flex>
        }
        hasData={hasUtilData}
        memoryData={heatmapData.utilMemoryHeatMap}
        cpuData={heatmapData.utilCpuHeatMap}
        loading={heatmapData.utilLoading}
        error={heatmapData.utilError}
        direction={hasNnData ? 'column' : 'row'}
      />
      <HeatmapPair
        title="Noisy neighbors"
        flavor={HeatMapFlavor.Pod}
        hasData={hasNnData}
        memoryData={heatmapData.noisyMemoryHeatMap}
        cpuData={heatmapData.noisyCpuHeatMap}
        loading={heatmapData.nnLoading}
        error={heatmapData.nnError}
        direction={hasUtilData ? 'column' : 'row'}
      />
    </Flex>
  )
}

function HeatmapPair({
  title,
  action,
  flavor,
  memoryData,
  cpuData,
  loading,
  error,
  hasData,
  direction = 'column',
}: {
  title: string
  action?: ReactNode
  flavor?: HeatMapFlavor
  memoryData: MetricPointResponseFragment[]
  cpuData: MetricPointResponseFragment[]
  loading: boolean
  error: Nullable<ApolloError>
  direction?: 'column' | 'row'
  hasData: boolean
}) {
  const { spacing } = useTheme()
  if (!hasData)
    return !(error || loading) ? null : (
      <Card css={{ padding: spacing.xlarge }}>
        {error ? (
          <GqlError
            css={{ width: '100%' }}
            error={error}
          />
        ) : loading ? (
          <LoadingIndicator />
        ) : (
          <EmptyState message={`${title} heatmaps not available.`} />
        )}
      </Card>
    )
  return (
    <Flex
      gap="medium"
      direction="column"
      flex={1}
      marginBottom={spacing.large}
    >
      <StretchedFlex minHeight={40}>
        <Subtitle2H1>{title}</Subtitle2H1>
        {action}
      </StretchedFlex>
      <Flex
        direction={direction}
        gap="medium"
      >
        <Card
          header={{
            content: `memory utilization${flavor ? ` by ${flavor}` : ''}`,
          }}
          css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
        >
          <UtilizationHeatmap
            loading={loading}
            colorScheme="blue"
            data={memoryData}
            flavor={flavor}
            utilizationType="memory"
          />
        </Card>
        <Card
          header={{
            content: `cpu utilization${flavor ? ` by ${flavor}` : ''}`,
          }}
          css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
        >
          <UtilizationHeatmap
            loading={loading}
            colorScheme="purple"
            data={cpuData}
            flavor={flavor}
            utilizationType="cpu"
          />
        </Card>
      </Flex>
    </Flex>
  )
}
