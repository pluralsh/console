import styled, { useTheme } from 'styled-components'

import {
  Card,
  Flex,
  InfoOutlineIcon,
  ListBoxItem,
  Select,
  Tooltip,
} from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { RadialBar } from '@nivo/radial-bar'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { CustomLegend } from 'components/home/CustomLegend'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  CHART_COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import {
  PARENT_NODE_NAME,
  TreeMap,
  TreeMapData,
} from 'components/utils/TreeMap'
import {
  ClusterVulnAggregateFragment,
  useClusterVulnerabilityAggregateQuery,
  VulnReportGrade,
} from 'generated/graphql'
import { useState } from 'react'
import { gradeToTextColorMap } from '../vulnerabilities/VulnReports'
import {
  SecurityChartData,
  SecurityChartDatum,
  useSecurityOverviewChartsData,
} from './useSecurityOverviewChartsData'

type PolicyQueryFilters = {
  clusters?: (string | null)[] | undefined
  namespaces?: (string | null)[] | undefined
  kinds?: (string | null)[] | undefined
  q?: string | undefined
}

const CHART_SIZE = 240
const HEATMAP_SIZE = 320

export function SecurityOverviewPieCharts({
  filters,
}: {
  filters?: PolicyQueryFilters
}) {
  const {
    clusterPolicyChartData,
    enforcementChartData,
    vulnChartData,
    clusterPolicyStatsError,
    enforcementStatsError,
    vulnStatsError,
  } = useSecurityOverviewChartsData(filters)

  if (clusterPolicyStatsError || enforcementStatsError || vulnStatsError) {
    return (
      <GqlError
        error={
          clusterPolicyStatsError || enforcementStatsError || vulnStatsError
        }
      />
    )
  }

  return (
    <ChartRowWrapperSC>
      <SecurityPieChartCard
        title="cluster violations"
        data={clusterPolicyChartData}
      />
      <SecurityPieChartCard
        title="constraints by enforcement"
        data={enforcementChartData}
      />
      <SecurityPieChartCard
        title="cluster security grades"
        data={vulnChartData}
      />
    </ChartRowWrapperSC>
  )
}

function SecurityPieChartCard({
  title,
  data,
}: {
  title: string
  data: SecurityChartData
}) {
  const theme = useTheme()

  const CenterLabel = createCenteredMetric(
    `${data[0]?.data ? getCompliancePercent(data[0].data) : '-'}%`,
    'Compliance'
  )

  return (
    <Card
      header={{
        content: (
          <Flex
            width="100%"
            justify="space-between"
            align="center"
          >
            <span>{title}</span>
            <Tooltip
              placement="left"
              label={<ChartLegend data={data} />}
            >
              <InfoOutlineIcon />
            </Tooltip>
          </Flex>
        ),
      }}
      css={{ padding: theme.spacing.large, flex: 1, minWidth: 'fit-content' }}
    >
      <ChartWrapperSC>
        {data ? (
          <RadialBar
            colors={(item) => item.data.color}
            endAngle={-360}
            cornerRadius={4}
            padAngle={1.5}
            padding={0}
            innerRadius={0.6}
            tooltip={(props) => (
              <ChartTooltip
                color={props.bar.color}
                value={props.bar.formattedValue}
                label={props.bar.category}
              />
            )}
            layers={['bars', CenterLabel]}
            data={data}
            height={CHART_SIZE}
            width={CHART_SIZE}
          />
        ) : (
          <ChartSkeleton scale={0.87} />
        )}
      </ChartWrapperSC>
    </Card>
  )
}

export function SecurityOverviewHeatmapCard() {
  const theme = useTheme()
  const [grade, setGrade] = useState<VulnReportGrade>(VulnReportGrade.A)

  const { data, loading, error } = useClusterVulnerabilityAggregateQuery({
    variables: { grade },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const vulns =
    data?.clusterVulnerabilityAggregate?.filter(
      (agg): agg is ClusterVulnAggregateFragment => !!agg
    ) ?? []
  if (error) return <GqlError error={error} />

  return (
    <TreeMapWrapperCardSC
      header={{
        size: 'large',
        content: (
          <Flex
            width="100%"
            justify="space-between"
            align="center"
          >
            <span>clusters by vulnerability count</span>
            <Flex
              align="center"
              gap="small"
            >
              <span>minimum severity:</span>
              <Select
                selectedKey={grade}
                label="Select grade"
                onSelectionChange={(key) => setGrade(key as VulnReportGrade)}
              >
                {Object.values(VulnReportGrade).map((gradeOption) => (
                  <ListBoxItem
                    key={gradeOption}
                    label={
                      <span
                        css={{
                          color: theme.colors[gradeToTextColorMap[gradeOption]],
                        }}
                      >
                        {gradeOption}
                      </span>
                    }
                  />
                ))}
              </Select>
            </Flex>
          </Flex>
        ),
      }}
    >
      <TreeMap
        loading={loading}
        data={clustersByVulnCount(vulns)}
        dataSize={vulns.length}
      />
    </TreeMapWrapperCardSC>
  )
}

function getCompliancePercent(data: SecurityChartDatum[]): number {
  const total = data.reduce((sum, d) => sum + d.y, 0)
  if (!total) return 0

  const compliant = data.find((d) => d.color === CHART_COLOR_MAP.green)?.y || 0
  return Math.round((compliant / total) * 100)
}

function clustersByVulnCount(vulns: ClusterVulnAggregateFragment[]) {
  const projectMap: Record<string, TreeMapData> = {}
  for (const vuln of vulns) {
    if (!vuln.cluster?.project) continue

    const project = vuln.cluster.project.name
    if (!projectMap[project])
      projectMap[project] = { name: project, children: [] }

    projectMap[project].children?.push({
      name: vuln.cluster.name ?? vuln.cluster.handle ?? vuln.cluster.id,
      amount: vuln.count,
    })
  }

  return {
    name: PARENT_NODE_NAME,
    children: Object.values(projectMap),
  }
}

const ChartRowWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  overflow: 'auto',
  gap: theme.spacing.large,
  minHeight: 'fit-content',
}))

const ChartWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.medium,
}))

const TreeMapWrapperCardSC = styled(Card)(({ theme }) => ({
  height: HEATMAP_SIZE,
  padding: theme.spacing.large,
}))

function ChartLegend({ data }: { data: SecurityChartData }) {
  return <CustomLegend data={data} />
}
