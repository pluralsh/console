import { ComputedNode } from '@nivo/treemap'
import {
  Card,
  CpuIcon,
  DatabaseIcon,
  Flex,
  FormField,
  ListBoxItem,
  ProjectIcon,
  RamIcon,
  Select,
} from '@pluralsh/design-system'
import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { GqlError } from 'components/utils/Alert'
import ProjectSelect, {
  AllProjectsOption,
} from 'components/utils/ProjectSelector'
import { OverlineH1 } from 'components/utils/typography/Text'
import {
  ProjectUsageHistoryFragment,
  useClusterUsagesQuery,
  useProjectUsageHistoryQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ElementType, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getCostManagementDetailsPath } from 'routes/costManagementRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { keySetToTagArray } from 'utils/clusterTags'
import { mapExistingNodes } from 'utils/graphql'
import { CM_TREE_MAP_CARD_HEIGHT, CMContextType } from './CostManagement'
import {
  CostManagementTreeMap,
  cpuCostByCluster,
  memoryCostByCluster,
} from './CostManagementTreeMap'
import { ProjectUsageTimeSeries } from './ProjectCostUsageSeries'

export type ProjectUsageMetric = Exclude<
  keyof ProjectUsageHistoryFragment,
  '__typename' | 'timestamp' | 'projectId'
>

export const METRIC_OPTIONS: Partial<
  Record<ProjectUsageMetric, { Icon: ElementType; label: string }>
> = {
  memory: { Icon: RamIcon, label: 'Memory' },
  cpu: { Icon: CpuIcon, label: 'CPU' },
  gpu: { Icon: CpuIcon, label: 'GPU' },
  storageCost: { Icon: DatabaseIcon, label: 'Storage cost' },
}

export function CostManagementChartView() {
  const { spacing } = useTheme()
  const navigate = useNavigate()
  const projectId = useProjectId()
  const { tagKeysState, tagOpState } = useOutletContext<CMContextType>()

  const [timeSeriesProjectId, setTimeSeriesProjectId] = useState(
    AllProjectsOption.id
  )
  const [timeSeriesMetric, setTimeSeriesMetric] =
    useState<ProjectUsageMetric>('memory')

  const {
    data: clusterUsagesData,
    loading: clusterUsagesLoading,
    error: clusterUsagesError,
  } = useClusterUsagesQuery({
    variables: {
      projectId,
      tagQuery: !isEmpty(tagKeysState[0])
        ? { op: tagOpState[0], tags: keySetToTagArray(tagKeysState[0]) }
        : undefined,
    },
    fetchPolicy: 'cache-and-network',
  })
  const {
    data: timeSeriesData,
    loading: timeSeriesLoading,
    error: timeSeriesError,
  } = useProjectUsageHistoryQuery({
    fetchPolicy: 'cache-and-network',
  })

  const clusterUsagesSize = clusterUsagesData?.clusterUsages?.edges?.length

  const { clusterUsages, clusterCpuCosts, clusterMemoryCosts, timeSeries } =
    useMemo(() => {
      const clusterUsages = mapExistingNodes(clusterUsagesData?.clusterUsages)
      const timeSeries = mapExistingNodes(timeSeriesData?.projectUsageHistory)
      return {
        clusterUsages,
        clusterCpuCosts: cpuCostByCluster(clusterUsages),
        clusterMemoryCosts: memoryCostByCluster(clusterUsages),
        timeSeries,
      }
    }, [clusterUsagesData, timeSeriesData])

  const handleTreeMapClick = (node: ComputedNode<object>) => {
    const clusterName = node.id
    const usageId = clusterUsages.find(
      (usage) => usage.cluster?.name === clusterName
    )?.id
    if (usageId) navigate(getCostManagementDetailsPath(usageId))
  }

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      overflow="auto"
      paddingRight={spacing.xxsmall} // gap for scrollbar
    >
      <TimeSeriesCardSC>
        <Flex
          gap="medium"
          padding="medium"
        >
          <FormField
            label="Project"
            css={{ width: 300 }}
          >
            <ProjectSelect
              selectedProject={timeSeriesProjectId}
              setSelectedProject={setTimeSeriesProjectId}
              titleContent={null}
              leftContent={<ProjectIcon color="icon-light" />}
              allowSelectAll
            />
          </FormField>
          <FormField
            label="Metric"
            css={{ width: 300 }}
          >
            <Select
              label="Select metric"
              selectedKey={timeSeriesMetric}
              onSelectionChange={(metric) =>
                setTimeSeriesMetric(metric as ProjectUsageMetric)
              }
            >
              {Object.entries(METRIC_OPTIONS).map(([id, { Icon, label }]) => (
                <ListBoxItem
                  key={id}
                  label={
                    <Flex gap="small">
                      <Icon color="icon-xlight" />
                      <span>{label}</span>
                    </Flex>
                  }
                />
              ))}
            </Select>
          </FormField>
        </Flex>
        <TimeSeriesContainerSC>
          <ProjectUsageTimeSeries
            data={timeSeries}
            metric={timeSeriesMetric}
            projectId={timeSeriesProjectId}
            loading={timeSeriesLoading}
            error={timeSeriesError}
          />
        </TimeSeriesContainerSC>
      </TimeSeriesCardSC>
      <Flex
        direction="column"
        gap="medium"
      >
        <TagsFilter
          selectedTagKeys={tagKeysState[0]}
          setSelectedTagKeys={tagKeysState[1]}
          searchOp={tagOpState[0]}
          setSearchOp={tagOpState[1]}
        />
        {clusterUsagesError ? (
          <GqlError error={clusterUsagesError} />
        ) : (
          <Flex gap="medium">
            <Card
              css={{
                padding: spacing.large,
                height: CM_TREE_MAP_CARD_HEIGHT,
                cursor: 'pointer',
              }}
              header={{
                outerProps: { style: { flex: 1 } },
                content: (
                  <Flex gap="small">
                    <CpuIcon />
                    <OverlineH1 as="h3">CPU cost by cluster</OverlineH1>
                  </Flex>
                ),
              }}
            >
              <CostManagementTreeMap
                colorScheme="blue"
                loading={clusterUsagesLoading}
                data={clusterCpuCosts}
                dataSize={clusterUsagesSize}
                onClick={handleTreeMapClick}
              />
            </Card>
            <Card
              css={{
                padding: spacing.large,
                height: CM_TREE_MAP_CARD_HEIGHT,
                cursor: 'pointer',
              }}
              header={{
                outerProps: { style: { flex: 1 } },
                content: (
                  <Flex gap="small">
                    <RamIcon />
                    <OverlineH1 as="h3">memory cost by cluster</OverlineH1>
                  </Flex>
                ),
              }}
            >
              <CostManagementTreeMap
                colorScheme="purple"
                loading={clusterUsagesLoading}
                data={clusterMemoryCosts}
                dataSize={clusterUsagesSize}
                onClick={handleTreeMapClick}
              />
            </Card>
          </Flex>
        )}
      </Flex>
    </Flex>
  )
}

const TimeSeriesCardSC = styled(Card)({
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
})

const TimeSeriesContainerSC = styled.div(({ theme }) => ({
  flex: 1,
  width: '100%',
  minHeight: 260,
  background: theme.colors['fill-accent'],
  borderTop: theme.borders.default,
}))
