import { ResponsiveLine } from '@nivo/line'
import { EmptyState } from '@pluralsh/design-system'
import { HOME_CARD_MAX_HEIGHT } from 'components/home/HomeCard'
import dayjs from 'dayjs'
import { ClusterUsageHistoryFragment } from 'generated/graphql'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { SliceTooltip, useGraphTheme } from '../../utils/Graph'

export function CostTimeSeriesGraph({
  history,
}: {
  history: ClusterUsageHistoryFragment[]
}) {
  const graphTheme = useGraphTheme()
  const data = getGraphData(history)

  if (!data) return <EmptyState message="No time-series data available" />

  return (
    <GraphWrapperSC>
      <ResponsiveLine
        // @ts-ignore, best for this to just be a fixed size
        height={HOME_CARD_MAX_HEIGHT}
        theme={graphTheme}
        data={data}
        tooltip={SliceTooltip}
        colors={COLORS}
        margin={{ top: 32, right: 128, bottom: 64, left: 64 }}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
        }}
        curve="basis"
        axisBottom={{
          format: (value) => dayjs(value).format('MMM DD, YYYY'),
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'time',
          legendOffset: 36,
          legendPosition: 'middle',
          truncateTickAt: 0,
        }}
        axisLeft={{
          format: (value) => `$${value}`,
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'cost',
          legendOffset: -40,
          legendPosition: 'middle',
          truncateTickAt: 0,
        }}
        xFormat={(value) => dayjs(value).format('MMM DD, YYYY')}
        pointSize={0}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableTouchCrosshair
        useMesh
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 32,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            itemTextColor: 'white',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
      />
    </GraphWrapperSC>
  )
}

type GraphData = {
  id: string
  data: {
    x: string
    y: number | null
  }[]
}
const getGraphData = (history: ClusterUsageHistoryFragment[]) => {
  const cpuData: GraphData = {
    id: 'CPU',
    data: [],
  }
  const memoryData: GraphData = {
    id: 'Memory',
    data: [],
  }
  const storageData: GraphData = {
    id: 'Storage',
    data: [],
  }

  history.forEach((point) => {
    cpuData.data.push({
      x: point.timestamp,
      y: point.cpuCost ?? null,
    })
    memoryData.data.push({
      x: point.timestamp,
      y: point.memoryCost ?? null,
    })
    storageData.data.push({
      x: point.timestamp,
      y: point.storageCost ? point.storageCost : null,
    })
  })

  const data = [cpuData, memoryData, storageData]

  // return null instead of empty arrays if there's no data at all
  return data.some((obj) => obj.data.length > 0) ? data : null
}

const GraphWrapperSC = styled.div((_) => ({
  height: '100%',
  width: '100%',
}))
