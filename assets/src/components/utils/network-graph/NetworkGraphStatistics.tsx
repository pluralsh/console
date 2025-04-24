import { Edge, useReactFlow, type Node } from '@xyflow/react'
import { filesize } from 'filesize'
import { NetworkMeshStatisticsFragment } from 'generated/graphql'
import { round } from 'lodash'
import styled from 'styled-components'
import { CaptionP } from '../typography/Text'
import { Card } from '@pluralsh/design-system'

export function NetworkGraphStatistics({
  selectedEdgeId,
}: {
  selectedEdgeId: string
}) {
  const { getEdge } = useReactFlow<
    Node,
    Edge<{ statistics: NetworkMeshStatisticsFragment }>
  >()
  const statistics = getEdge(selectedEdgeId)?.data?.statistics
  if (!statistics) return null

  return (
    <WrapperSC>
      <Statistic
        value={filesize(statistics.bytes ?? 0)}
        suffix="sent"
      />
      <Statistic
        value={statistics.packets}
        suffix="packets"
      />
      <Statistic
        value={statistics.connections}
        suffix="tcp connections"
      />
      <Statistic
        value={statistics.http200}
        suffix="http 200s"
      />
      <Statistic
        value={statistics.http400}
        suffix="http 400s"
      />
      <Statistic
        value={statistics.http500}
        suffix="http 500s"
      />
      {statistics.httpClientLatency && (
        <Statistic
          value={round(statistics.httpClientLatency, 2)}
          suffix="ms latency"
        />
      )}
    </WrapperSC>
  )
}

function Statistic({
  value,
  suffix,
  precision = 2,
}: {
  value: Nullable<number | string>
  suffix: string
  precision?: number
}) {
  const displayValue =
    typeof value === 'string' ? value : round(value ?? 0, precision)

  return (
    <div>
      <CaptionP
        as="span"
        $color="text"
      >
        {displayValue}
      </CaptionP>{' '}
      <CaptionP
        as="span"
        $color="text-xlight"
      >
        {suffix}
      </CaptionP>
    </div>
  )
}

const WrapperSC = styled(Card)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing.xsmall,
  left: theme.spacing.xsmall,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.xsmall,
}))
