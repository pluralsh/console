import {
  Card,
  EmptyState,
  Flex,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { HeatMapFlavor, useServiceHeatMapQuery } from 'generated/graphql'
import { capitalize } from 'lodash'
import styled, { useTheme } from 'styled-components'

import { CaptionP, Subtitle2H1 } from 'components/utils/typography/Text'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { isNonNullable } from 'utils/isNonNullable'

import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { UtilizationHeatmap } from 'components/utils/UtilizationHeatmap'

const HEATMAP_HEIGHT = 350

export function ServiceMetrics() {
  const { spacing } = useTheme()
  const { serviceId } = useParams()
  const metricsEnabled = useMetricsEnabled()
  const [heatMapFlavor, setHeatMapFlavor] = useState<HeatMapFlavor>(
    HeatMapFlavor.Pod
  )

  const {
    data: heatMapData,
    loading: heatMapLoading,
    error: heatMapError,
  } = useServiceHeatMapQuery({
    variables: { serviceId: serviceId ?? '', flavor: heatMapFlavor },
    skip: !metricsEnabled,
    fetchPolicy: 'cache-and-network',
    pollInterval: 60_000,
  })

  const { cpuHeatMap, memoryHeatMap } = useMemo(
    () => ({
      cpuHeatMap:
        heatMapData?.serviceDeployment?.heatMap?.cpu?.filter(isNonNullable) ??
        [],
      memoryHeatMap:
        heatMapData?.serviceDeployment?.heatMap?.memory?.filter(
          isNonNullable
        ) ?? [],
    }),
    [heatMapData?.serviceDeployment?.heatMap]
  )

  if (!metricsEnabled) return <EmptyState message="Metrics are not enabled." />

  return (
    <WrapperSC>
      <Flex
        width="100%"
        align="center"
        justifyContent="space-between"
      >
        <Subtitle2H1>Memory & CPU utliization</Subtitle2H1>
        <Flex
          gap="small"
          align="center"
        >
          <CaptionP $color="text-xlight">Group by</CaptionP>
          <Select
            width={160}
            selectedKey={heatMapFlavor}
            onSelectionChange={(e) => setHeatMapFlavor(e as HeatMapFlavor)}
          >
            {Object.values(HeatMapFlavor)
              .filter((flavor) => flavor !== HeatMapFlavor.Namespace)
              .map((flavor) => (
                <ListBoxItem
                  key={flavor}
                  label={capitalize(flavor)}
                />
              ))}
          </Select>
        </Flex>
      </Flex>
      {!heatMapData ? (
        <Card css={{ padding: spacing.xlarge, flex: 1 }}>
          {heatMapError ? (
            <GqlError
              css={{ width: '100%' }}
              error={heatMapError}
            />
          ) : heatMapLoading ? (
            <LoadingIndicator />
          ) : (
            <EmptyState message="Utilization heatmaps not available." />
          )}
        </Card>
      ) : (
        <>
          <Card
            header={{
              content: `memory utilization by ${heatMapFlavor}`,
              outerProps: { style: { overflow: 'visible' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            <UtilizationHeatmap
              colorScheme="blue"
              data={memoryHeatMap}
              flavor={heatMapFlavor}
              utilizationType="memory"
            />
          </Card>
          <Card
            header={{
              content: `cpu utilization by ${heatMapFlavor}`,
              outerProps: { style: { overflow: 'visible' } },
            }}
            css={{ height: HEATMAP_HEIGHT, padding: spacing.medium }}
          >
            <UtilizationHeatmap
              colorScheme="purple"
              data={cpuHeatMap}
              flavor={heatMapFlavor}
              utilizationType="cpu"
            />
          </Card>
        </>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
}))
