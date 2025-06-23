import { isNullish } from '@apollo/client/cache/inmemory/helpers'
import {
  Card,
  ChartIcon,
  CpuIcon,
  DatabaseIcon,
  DeltaDownIcon,
  DeltaUpIcon,
  Flex,
  LoadingSpinner,
  RamIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Body1P, Title1H1 } from 'components/utils/typography/Text'
import dayjs from 'dayjs'
import { ClusterUsageHistoryFragment } from 'generated/graphql'
import { ReactNode, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  COST_MANAGEMENT_ABS_PATH,
  COST_MANAGEMENT_REL_PATH,
} from 'routes/costManagementRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { CMContextType } from './CostManagementDetails'
import {
  CostTimeSeriesGraph,
  GRAPH_CARD_MAX_HEIGHT,
} from './CostTimeSeriesGraph'

const getBreadcrumbs = (clusterName: string) => [
  { label: COST_MANAGEMENT_REL_PATH, url: COST_MANAGEMENT_ABS_PATH },
  { label: clusterName },
  { label: 'overview' },
]

export function CostManagementDetailsOverview() {
  const { historyQuery, clusterName } = useOutletContext<CMContextType>()
  useSetBreadcrumbs(
    useMemo(() => getBreadcrumbs(clusterName ?? ''), [clusterName])
  )
  const { data, loading, error } = historyQuery
  const usageData = data?.clusterUsage

  if (!usageData && loading) return <LoadingSpinner />
  if (error) return <GqlError error={error} />

  const history =
    usageData?.history?.edges
      ?.map((edge) => edge?.node)
      .filter((node): node is ClusterUsageHistoryFragment => !!node) ?? []

  const mostRecent = history[history.length - 1]
  const deltaTimeframe = `${Math.max(
    dayjs().diff(dayjs(mostRecent?.timestamp), 'days'),
    1
  )}D`

  const cpuDelta = getDelta(usageData?.cpuCost, mostRecent?.cpuCost)
  const memoryDelta = getDelta(usageData?.memoryCost, mostRecent?.memoryCost)
  const storageDelta = getDelta(usageData?.storageCost, mostRecent?.storageCost)

  return (
    <Flex
      gap="large"
      direction="column"
      height="100%"
    >
      <Flex gap="large">
        <CostCard
          title="cpu cost"
          value={usageData?.cpuCost}
          icon={<CpuIcon />}
          delta={cpuDelta}
          deltaTimeframe={deltaTimeframe}
        />
        <CostCard
          title="memory cost"
          value={usageData?.memoryCost}
          icon={<RamIcon />}
          delta={memoryDelta}
          deltaTimeframe={deltaTimeframe}
        />
        <CostCard
          title="storage cost"
          value={usageData?.storageCost}
          icon={<DatabaseIcon />}
          delta={storageDelta}
          deltaTimeframe={deltaTimeframe}
        />
      </Flex>
      <Card
        css={{ height: 'calc(100% - 40px)', maxHeight: GRAPH_CARD_MAX_HEIGHT }} // hardcoded to size of header
        header={{
          outerProps: { style: { overflow: 'visible' } },
          content: (
            <Flex gap="small">
              <ChartIcon />
              Cluster time-series (CPU, Memory, storage)
            </Flex>
          ),
        }}
      >
        <CostTimeSeriesGraph history={history} />
      </Card>
    </Flex>
  )
}

function CostCard({
  title,
  icon,
  value,
  delta,
  deltaTimeframe,
}: {
  title: string
  icon: ReactNode
  value?: Nullable<number>
  delta?: Nullable<number>
  deltaTimeframe: string
}) {
  const theme = useTheme()
  let deltaIcon
  let deltaColor
  if (delta) {
    deltaIcon = delta > 0 ? <DeltaUpIcon /> : <DeltaDownIcon />
    deltaColor = delta > 0 ? 'text-danger-light' : 'text-success-light'
  } else {
    deltaIcon = '—'
    deltaColor = 'text-xlight'
  }

  return (
    <Card
      header={{
        content: (
          <Flex gap="small">
            {icon}
            {title}
          </Flex>
        ),
      }}
      css={{ padding: `${theme.spacing.large}px ${theme.spacing.xlarge}px` }}
    >
      <Flex direction="column">
        <Title1H1 as="span">
          <span css={{ color: theme.colors['text-xlight'] }}>$ </span>
          {value?.toFixed(2) ?? '--'}
        </Title1H1>
        <Body1P
          as="span"
          $color={deltaColor}
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xxsmall,
          }}
        >
          <IconWrapperSC>{deltaIcon}</IconWrapperSC>
          {`$${!isNullish(delta) ? Math.abs(delta).toFixed(2) : '--'} (${
            isNullish(delta) || isNullish(value)
              ? '--'
              : ((Math.abs(delta) / value) * 100).toFixed(2)
          }%)`}
          <span css={{ color: theme.colors['text-xlight'] }}>
            {deltaTimeframe}
          </span>
        </Body1P>
      </Flex>
    </Card>
  )
}

const getDelta = (current?: number | null, previous?: number | null) =>
  isNullish(current) || isNullish(previous) ? null : current - previous

const IconWrapperSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 20,
  width: 20,
})
