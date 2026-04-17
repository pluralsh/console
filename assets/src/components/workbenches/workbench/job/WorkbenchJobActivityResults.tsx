import { ResponsiveLine, ResponsiveLineCanvas } from '@nivo/line'
import {
  Button,
  Card,
  Flex,
  FlexProps,
  IconFrame,
  IconProps,
  Modal,
  NotebookIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import {
  SimpleAccordion,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { LogLine } from 'components/cd/logs/LogLine'
import { GqlError } from 'components/utils/Alert'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import DiffViewer from 'components/utils/DiffViewer'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchJobMetricsToolQuery,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityMetricFragment,
  WorkbenchJobActivityResultFragment,
  WorkbenchToolQueryData,
} from 'generated/graphql'
import { groupBy, isEmpty, isNil, truncate } from 'lodash'
import {
  ComponentPropsWithRef,
  ComponentType,
  ReactNode,
  useMemo,
  useState,
} from 'react'
import { DiffMethod } from 'react-diff-viewer'
import styled, { useTheme } from 'styled-components'
import { COLORS } from 'utils/color'
import { toDateOrUndef } from 'utils/datetime'
import { getOldContentFromTextDiff } from 'utils/textDiff'
import { isNonNullable } from 'utils/isNonNullable'

export function MemoActivityIcon({
  jobUpdate,
}: {
  jobUpdate: Nullable<WorkbenchJobActivityResultFragment['jobUpdate']>
}) {
  const newValue = jobUpdate?.workingTheory ?? jobUpdate?.conclusion ?? ''
  const oldValue = useMemo(
    () => getOldContentFromTextDiff(newValue, jobUpdate?.diff),
    [newValue, jobUpdate?.diff]
  )
  return (
    <ActivityModalIcon
      icon={NotebookIcon}
      tooltip="View diff"
      modalHeader={`Updated ${jobUpdate?.workingTheory ? 'working theory' : 'conclusion'}`}
      modalContent={
        <DiffViewer
          compareMethod={DiffMethod.WORDS}
          oldValue={oldValue}
          newValue={newValue}
        />
      }
    />
  )
}

export function UserActivityResult({
  activity,
}: {
  activity: WorkbenchJobActivityFragment
}) {
  const { prompt } = activity
  return (
    <PromptCardSC>
      <SimplifiedMarkdown text={prompt ?? ''} />
    </PromptCardSC>
  )
}

export function JobActivityLogs({
  logs,
  cardWrapper = false,
}: {
  logs: WorkbenchJobActivityLogFragment[]
  cardWrapper?: boolean
}) {
  if (isEmpty(logs)) return null

  return (
    <WrapWithIf
      condition={cardWrapper}
      wrapper={<Card css={{ height: '100%', overflow: 'auto' }} />}
    >
      <Flex direction="column">
        {logs.map((log, i) => (
          <LogLine
            key={i}
            line={{ log: log.message, timestamp: log.timestamp }}
          />
        ))}
      </Flex>
    </WrapWithIf>
  )
}

const CANVAS_THRESHOLD = 1000

export type WorkbenchMetricsToolQueryInput = Pick<
  WorkbenchToolQueryData,
  'toolName' | 'toolArgs' | 'summary'
>

export function hasWorkbenchMetricsToolQuery(
  q: Nullable<Pick<WorkbenchToolQueryData, 'toolName' | 'toolArgs'>>
): boolean {
  if (!q?.toolName?.trim()) return false
  return q.toolArgs != null && typeof q.toolArgs === 'object'
}

/** Renders pre-fetched metric points (e.g. thought tool attributes). */
export function JobActivityMetricsChart({
  metrics,
  lineProps,
  ...props
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
  lineProps?: Partial<
    ComponentPropsWithRef<typeof ResponsiveLine> &
      ComponentPropsWithRef<typeof ResponsiveLineCanvas>
  >
} & ComponentPropsWithRef<typeof MetricsChartSC>) {
  const graphTheme = useGraphTheme()

  const graphData = useMemo(() => {
    const grouped = groupBy(
      metrics,
      ({ name, labels }) =>
        `${name ?? 'metric'}{${
          Object.entries(labels ?? {})
            .map(([key, value]) => `${key}:${value}`)
            .join(',') ?? ''
        }}`
    )
    return Object.entries(grouped).map(([name, points]) => ({
      id: name,
      data: points
        .map((p) => ({ x: toDateOrUndef(p.timestamp), y: p.value }))
        .filter(
          (pt): pt is { x: Date; y: number } => !isNil(pt.x) && !isNil(pt.y)
        ),
    }))
  }, [metrics])

  if (isEmpty(metrics)) return null

  const sharedProps = {
    theme: graphTheme,
    data: graphData,
    colors: COLORS,
    margin: { top: 10, right: 25, bottom: 30, left: 30 } as const,
    xScale: { type: 'time' as const, format: 'native' as const },
    yScale: { type: 'linear' as const },
    xFormat: dateFormat,
    lineWidth: 1,
    enablePoints: false,
    axisLeft: { tickValues: 5 },
    axisBottom: { format: '%H:%M:%S', tickValues: 5 },
    tooltip: SliceTooltip,
  }

  return (
    <MetricsChartSC {...props}>
      {metrics.length > CANVAS_THRESHOLD ? (
        <ResponsiveLineCanvas
          {...sharedProps}
          {...lineProps}
        />
      ) : (
        <ResponsiveLine
          {...sharedProps}
          useMesh
          {...lineProps}
        />
      )}
    </MetricsChartSC>
  )
}

/**
 * Loads metric series via `metricsTool` when `metricsQuery` is present on the
 * activity or job result. Omit when there is no tool query to run.
 */
export function JobActivityMetrics({
  jobId,
  metricsQuery,
  fetchWhen = true,
  withLegend = false,
  lineProps,
  skeletonHeight = 160,
  ...props
}: {
  jobId: string
  metricsQuery: Nullable<WorkbenchMetricsToolQueryInput>
  /** When false, skips the GraphQL request (e.g. collapsed activity accordion). */
  fetchWhen?: boolean
  withLegend?: boolean
  skeletonHeight?: number
  lineProps?: Partial<
    ComponentPropsWithRef<typeof ResponsiveLine> &
      ComponentPropsWithRef<typeof ResponsiveLineCanvas>
  >
} & ComponentPropsWithRef<typeof MetricsChartSC>) {
  const shouldRunQuery =
    !!jobId && fetchWhen && hasWorkbenchMetricsToolQuery(metricsQuery)

  const { data, loading, error } = useWorkbenchJobMetricsToolQuery({
    variables: {
      id: jobId,
      name: metricsQuery?.toolName?.trim(),
      arguments: metricsQuery?.toolArgs
        ? JSON.stringify(metricsQuery?.toolArgs)
        : undefined,
    },
    skip: !shouldRunQuery,
  })

  if (!hasWorkbenchMetricsToolQuery(metricsQuery)) return null

  if (!fetchWhen) return null

  if (error)
    return (
      <GqlError
        error={error}
        css={{ wordBreak: 'break-word' }}
      />
    )

  const metrics = data?.workbenchJob?.metricsTool?.filter(isNonNullable) ?? []

  if (loading || !data)
    return (
      <RectangleSkeleton
        $height={skeletonHeight}
        $width="100%"
      />
    )

  if (isEmpty(metrics)) return null

  const seriesNames = Object.keys(groupBy(metrics, (m) => m.name ?? 'metric'))
  const summaryText = metricsQuery?.summary?.trim()

  const chartBlock = (
    <Flex
      direction="column"
      gap="xsmall"
      width="100%"
    >
      <JobActivityMetricsChart
        metrics={metrics}
        lineProps={lineProps}
        {...props}
      />
      {summaryText ? (
        <Body2P
          $color="text-light"
          css={{ lineHeight: 1.45 }}
        >
          {summaryText}
        </Body2P>
      ) : null}
    </Flex>
  )

  if (!withLegend) return chartBlock

  return (
    <Flex
      direction="column"
      gap="medium"
      width="100%"
    >
      {chartBlock}
      <WorkbenchJobMetricsLegend
        seriesNames={seriesNames}
        paddingLeft={20}
      />
    </Flex>
  )
}

export function WorkbenchJobMetricsLegend({
  seriesNames,
  ...props
}: {
  seriesNames: string[]
} & FlexProps) {
  if (isEmpty(seriesNames)) return null

  return (
    <Flex
      wrap="wrap"
      gap="small"
      align="center"
      {...props}
    >
      {seriesNames.map((name, i) => (
        <Flex
          key={name}
          align="center"
          gap="xsmall"
        >
          <MetricsLegendSwatchSC $color={COLORS[i % COLORS.length]} />
          <Body2P $color="text-light">{name}</Body2P>
        </Flex>
      ))}
    </Flex>
  )
}

export function JobActivityPrompt({ prompt }: { prompt: Nullable<string> }) {
  const { spacing } = useTheme()
  if (!prompt) return null
  return (
    <SimpleAccordion
      label={
        <span>
          <strong>Prompt: </strong>
          {truncate(prompt, { length: 40 })}
        </span>
      }
    >
      <Card css={{ padding: spacing.medium, background: 'none' }}>
        <SimplifiedMarkdown text={prompt} />
      </Card>
    </SimpleAccordion>
  )
}

export function ActivityModalIcon({
  icon: Icon,
  onClick,
  tooltip,
  modalHeader,
  modalContent,
}: {
  icon: ComponentType<IconProps>
  onClick?: () => void
  tooltip: string | undefined
  modalHeader: string
  modalContent: ReactNode
}) {
  const [showModal, setShowModal] = useState(false)
  const [finishedAnimating, setFinishedAnimating] = useState(false)
  return (
    <>
      <IconFrame
        clickable
        as="a" // using an "a" tag because technically buttons can't be nested inside other buttons (e.g. the accordion trigger)
        size="small"
        tooltip={tooltip}
        icon={
          <Icon
            color="icon-xlight"
            style={{ width: 14 }}
          />
        }
        onClick={(e) => {
          e.preventDefault()
          setShowModal(true)
          onClick?.()
        }}
      />
      <Modal
        header={modalHeader}
        size="large"
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setFinishedAnimating(false)
        }}
        scrollable={false}
        onAnimationEnd={() => setFinishedAnimating(true)}
        actions={
          <Button
            secondary
            onClick={() => setShowModal(false)}
          >
            Close
          </Button>
        }
      >
        {finishedAnimating ? (
          modalContent
        ) : (
          <RectangleSkeleton
            $height={160}
            $width="100%"
          />
        )}
      </Modal>
    </>
  )
}

const MetricsChartSC = styled.div(() => ({
  height: 160,
  width: '100%',
}))

const MetricsLegendSwatchSC = styled.div<{ $color: string }>(({ $color }) => ({
  width: 12,
  height: 12,
  borderRadius: 2,
  flexShrink: 0,
  background: $color,
}))

const PromptCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  width: 'fit-content',
  marginLeft: 'auto',
  marginTop: theme.spacing.small,
  marginBottom: theme.spacing.small,
}))
