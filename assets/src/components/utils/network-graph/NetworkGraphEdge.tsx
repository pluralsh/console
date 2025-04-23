import { IconFrame, InfoIcon } from '@pluralsh/design-system'
import { BaseEdge, Edge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
import { filesize } from 'filesize'
import { NetworkMeshStatisticsFragment } from 'generated/graphql'
import { round } from 'lodash'
import { use } from 'react'
import styled, { useTheme } from 'styled-components'
import { EdgeProps, generateElkEdgePath } from '../reactflow/edges'
import { MarkerType } from '../reactflow/markers'
import { CaptionP } from '../typography/Text'
import { ExpandedNetworkInfoCtx } from './NetworkGraph'

type NetworkEdgeData = {
  statistics: NetworkMeshStatisticsFragment
  label: string
}

type NetworkEdgeProps = EdgeProps<Edge<NetworkEdgeData>> & {
  style?: React.CSSProperties
  markerEnd?: string
}

export function NetworkEdge({ id, style = {}, data }: NetworkEdgeProps) {
  const theme = useTheme()
  const { updateEdge } = useReactFlow()
  const path = generateElkEdgePath(data?.elkPathData)

  const { expandedId, setExpandedId } = use(ExpandedNetworkInfoCtx)
  const isExpanded = expandedId === id
  const toggleExpanded = () => {
    setExpandedId(isExpanded ? undefined : id)
    if (expandedId) updateEdge(expandedId, { zIndex: 0 })
    updateEdge(id, { zIndex: isExpanded ? 0 : 1 })
  }

  // TODO: get label position from elk
  const start = data?.elkPathData?.[0].startPoint ?? { x: 0, y: 0 }
  const end = data?.elkPathData?.[0].endPoint ?? { x: 0, y: 0 }
  const labelX = start.x + (end.x - start.x) / (isExpanded ? 2 : 3)
  const labelY = start.y + (end.y - start.y) / (isExpanded ? 2 : 3)

  return (
    <>
      <BaseEdge
        path={path}
        style={{
          ...style,
          cursor: 'pointer',
          stroke: isExpanded
            ? theme.colors['border-primary']
            : theme.colors['fill-three'],
        }}
        markerEnd={`url(#${isExpanded ? MarkerType.ArrowPrimary : MarkerType.ArrowStrong})`}
        onClick={toggleExpanded}
      />
      <EdgeLabelRenderer>
        <EdgeLabelSC
          $isExpanded={isExpanded}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={toggleExpanded}
        >
          {isExpanded && data ? (
            <ExpandedContentSC>
              <Statistic
                value={filesize(data.statistics.bytes ?? 0)}
                suffix="sent"
              />
              <Statistic
                value={data.statistics.packets}
                suffix="packets"
              />
              <Statistic
                value={data.statistics.connections}
                suffix="tcp connections"
              />
              <Statistic
                value={data.statistics.http200}
                suffix="http 200s"
              />
              <Statistic
                value={data.statistics.http400}
                suffix="http 400s"
              />
              <Statistic
                value={data.statistics.http500}
                suffix="http 500s"
              />
              {data.statistics.httpClientLatency && (
                <Statistic
                  value={round(data.statistics.httpClientLatency, 2)}
                  suffix="ms latency"
                />
              )}
            </ExpandedContentSC>
          ) : (
            <IconFrame
              clickable
              type="floating"
              icon={<InfoIcon />}
              onClick={toggleExpanded}
            />
          )}
        </EdgeLabelSC>
      </EdgeLabelRenderer>
    </>
  )
}

const EdgeLabelSC = styled.div<{ $isExpanded: boolean }>(({ $isExpanded }) => ({
  position: 'absolute',
  cursor: 'pointer',
  zIndex: $isExpanded ? 1000 : 1,
}))

const ExpandedContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  background: theme.colors['fill-one'],
  padding: theme.spacing.xsmall,
  boxShadow: theme.boxShadows.slight,
  borderRadius: theme.borderRadiuses.medium,
  transition: 'all 0.2s ease',
  fontWeight: 700,
}))

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
