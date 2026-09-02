import { filesize } from 'filesize'
import { NetworkMeshStatisticsFragment } from 'generated/graphql'
import { round } from 'lodash'
import styled from 'styled-components'
import { CaptionP } from '../typography/Text'
import { Card } from '@pluralsh/design-system'
import { Edge } from '../reactflow/edges'
import { NetworkEdgeData } from './NetworkGraph'

export function NetworkGraphStatistics({
  selectedEdge,
}: {
  selectedEdge: Edge<NetworkEdgeData>
}) {
  return (
    <CardContainerSC>
      {selectedEdge?.data?.statsArr?.map(({ from, to, stats }, i) => (
        <NetworkGraphStatisticsCard
          key={`${selectedEdge.id}-${i}`}
          from={from.name}
          to={to.name}
          statistics={stats}
        />
      ))}
    </CardContainerSC>
  )
}

function NetworkGraphStatisticsCard({
  from,
  to,
  statistics,
}: {
  from: string
  to: string
  statistics: NetworkMeshStatisticsFragment
}) {
  return (
    <WrapperSC>
      <CaptionP css={{ wordBreak: 'break-word' }}>
        <strong>{from}</strong> {'\u2192'} <strong>{to}</strong>
      </CaptionP>
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
    <span>
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
    </span>
  )
}

const WrapperSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: theme.spacing.xsmall,
  maxWidth: 160,
}))

const CardContainerSC = styled.div(({ theme }) => ({
  position: 'absolute',
  display: 'flex',
  gap: theme.spacing.xsmall,
  top: theme.spacing.xsmall,
  left: theme.spacing.xsmall,
}))
