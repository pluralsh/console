import { useApolloClient } from '@apollo/client'
import { Markdown } from '@pluralsh/design-system'
import { PieChart } from 'components/utils/PieChart'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchCanvasStreamSubscription,
  WorkbenchCanvasBlockFragment,
  WorkbenchCanvasBlockGraph,
  WorkbenchCanvasBlockType,
  WorkbenchCanvasToolGraph,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityFragmentDoc,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import styled, { useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import { updateFragment } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityLogsFromTool,
  JobActivityMetrics,
} from './WorkbenchJobActivityResults'

const COLUMNS = 3
const ROW_HEIGHT_PX = 40
const MIN_GRID_WIDTH_PX = 600

export function WorkbenchJobCanvas({
  jobId,
  activityId,
  canvas,
}: {
  jobId: string
  activityId?: string
  canvas: Nullable<Nullable<WorkbenchCanvasBlockFragment>[]>
}) {
  const client = useApolloClient()
  useWorkbenchCanvasStreamSubscription({
    variables: { jobId, activityId },
    skip: !jobId || !activityId,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const block = data?.workbenchCanvasStream
      if (!block || !activityId) return
      mergeCanvasBlockInActivityCache(client.cache, activityId, block)
    },
  })

  const blocks = (canvas ?? []).filter(isNonNullable)
  if (isEmpty(blocks)) return null

  return (
    <GridScrollAreaSC>
      <CanvasGrid
        jobId={jobId}
        blocks={blocks}
      />
    </GridScrollAreaSC>
  )
}

const mergeCanvasBlockInActivityCache = (
  cache: ReturnType<typeof useApolloClient>['cache'],
  activityId: string,
  block: WorkbenchCanvasBlockFragment
) =>
  updateFragment(cache, {
    id: cache.identify({ __typename: 'WorkbenchJobActivity', id: activityId }),
    fragment: WorkbenchJobActivityFragmentDoc,
    fragmentName: 'WorkbenchJobActivity',
    update: (prev: WorkbenchJobActivityFragment) => {
      if (!prev.result) return prev
      const existing = (prev.result.canvas ?? []).filter(isNonNullable)
      const idx = block.identifier
        ? existing.findIndex((b) => b.identifier === block.identifier)
        : -1
      const canvas =
        idx >= 0
          ? existing.map((b, i) => (i === idx ? block : b))
          : [...existing, block]
      return { ...prev, result: { ...prev.result, canvas } }
    },
  })

function CanvasGrid({
  jobId,
  blocks,
}: {
  jobId: string
  blocks: WorkbenchCanvasBlockFragment[]
}) {
  const sorted = [...blocks].sort((a, b) => {
    const ay = a.layout?.y ?? 0
    const by = b.layout?.y ?? 0
    if (ay !== by) return ay - by
    return (a.layout?.x ?? 0) - (b.layout?.x ?? 0)
  })
  return (
    <GridSC>
      {sorted.map((block, i) => (
        <BlockCellSC
          key={block.identifier ?? i}
          $x={block.layout?.x ?? 0}
          $y={block.layout?.y ?? i}
          $w={block.layout?.w ?? COLUMNS}
          $h={block.layout?.h ?? 4}
        >
          <CanvasBlockRenderer
            jobId={jobId}
            block={block}
          />
        </BlockCellSC>
      ))}
    </GridSC>
  )
}

function CanvasBlockRenderer({
  jobId,
  block,
}: {
  jobId: string
  block: WorkbenchCanvasBlockFragment
}) {
  const { type, content } = block

  switch (type) {
    case WorkbenchCanvasBlockType.Markdown:
      return <MarkdownBlock text={content?.markdown ?? ''} />
    case WorkbenchCanvasBlockType.Metrics:
      return (
        <MetricsBlock
          jobId={jobId}
          graph={content?.metrics}
        />
      )
    case WorkbenchCanvasBlockType.Logs:
      return (
        <LogsBlock
          jobId={jobId}
          graph={content?.logs}
        />
      )
    case WorkbenchCanvasBlockType.Pie:
      return <PieBlock graph={content?.pie} />
    case WorkbenchCanvasBlockType.Bar:
      return <BarBlock graph={content?.bar} />
    default:
      return null
  }
}

function MarkdownBlock({ text }: { text: string }) {
  return (
    <BlockCardSC>
      <Markdown text={text || '_No content._'} />
    </BlockCardSC>
  )
}

function MetricsBlock({
  jobId,
  graph,
}: {
  jobId: string
  graph: Nullable<WorkbenchCanvasToolGraph>
}) {
  return (
    <BlockCardSC>
      {graph?.title && <BlockTitle>{graph.title}</BlockTitle>}
      <JobActivityMetrics
        jobId={jobId}
        metricsQuery={graph?.query}
        css={{ flex: 1, minHeight: 120 }}
      />
      {graph?.summary && <Body2P $color="text-light">{graph.summary}</Body2P>}
    </BlockCardSC>
  )
}

function LogsBlock({
  jobId,
  graph,
}: {
  jobId: string
  graph: Nullable<WorkbenchCanvasToolGraph>
}) {
  return (
    <BlockCardSC>
      {graph?.title && <BlockTitle>{graph.title}</BlockTitle>}
      <div css={{ flex: 1, minHeight: 120, minWidth: 0, overflow: 'auto' }}>
        <JobActivityLogsFromTool
          jobId={jobId}
          logsQuery={graph?.query}
        />
      </div>
      {graph?.summary && <Body2P $color="text-light">{graph.summary}</Body2P>}
    </BlockCardSC>
  )
}

function PieBlock({ graph }: { graph: Nullable<WorkbenchCanvasBlockGraph> }) {
  const points = (graph?.data ?? []).filter(isNonNullable)
  const data = points.map((p, i) => ({
    id: p.label ?? `slice-${i}`,
    label: p.label ?? '',
    value: p.value ?? 0,
    color: COLORS[i % COLORS.length],
  }))
  return (
    <BlockCardSC>
      {graph?.title && <BlockTitle>{graph.title}</BlockTitle>}
      <div css={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <PieChart data={data} />
      </div>
    </BlockCardSC>
  )
}

function BarBlock({ graph }: { graph: Nullable<WorkbenchCanvasBlockGraph> }) {
  const points = (graph?.data ?? []).filter(isNonNullable)
  const max = Math.max(...points.map((p) => p.value ?? 0), 1)
  return (
    <BlockCardSC>
      {graph?.title && <BlockTitle>{graph.title}</BlockTitle>}
      <BarListSC>
        {points.map((p, i) => (
          <BarRowSC key={`${p.label ?? ''}-${i}`}>
            <BarLabelSC title={p.label ?? ''}>{p.label ?? ''}</BarLabelSC>
            <BarTrackSC>
              <BarFillSC
                $pct={((p.value ?? 0) / max) * 100}
                $color={COLORS[i % COLORS.length]}
              />
            </BarTrackSC>
            <BarValueSC>{p.value ?? 0}</BarValueSC>
          </BarRowSC>
        ))}
      </BarListSC>
    </BlockCardSC>
  )
}

function BlockTitle({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme()
  return (
    <Body2BoldP css={{ marginBottom: spacing.xsmall }}>{children}</Body2BoldP>
  )
}

const GridScrollAreaSC = styled.div(() => ({
  width: '100%',
  overflowX: 'auto',
}))

const GridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
  gridAutoRows: `${ROW_HEIGHT_PX}px`,
  gap: theme.spacing.small,
  width: '100%',
  minWidth: MIN_GRID_WIDTH_PX,
}))

const BlockCellSC = styled.div<{
  $x: number
  $y: number
  $w: number
  $h: number
}>(({ $x, $y, $w, $h }) => ({
  gridColumn: `${Math.max(1, $x + 1)} / span ${Math.max(1, Math.min($w, COLUMNS))}`,
  gridRow: `${Math.max(1, $y + 1)} / span ${Math.max(1, $h)}`,
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
}))

const BlockCardSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  width: '100%',
  height: '100%',
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  background: 'transparent',
  border: theme.borders.default,
  borderRadius: theme.borderRadiuses.large,
}))

const BarListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
}))

const BarRowSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(60px, 120px) 1fr auto',
  alignItems: 'center',
  gap: theme.spacing.small,
}))

const BarLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}))

const BarTrackSC = styled.div(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  background: theme.colors['fill-two'],
  overflow: 'hidden',
}))

const BarFillSC = styled.div<{ $pct: number; $color: string }>(
  ({ $pct, $color }) => ({
    width: `${Math.max(0, Math.min(100, $pct))}%`,
    height: '100%',
    background: $color,
    borderRadius: 4,
    transition: 'width 200ms ease-out',
  })
)

const BarValueSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text'],
}))
