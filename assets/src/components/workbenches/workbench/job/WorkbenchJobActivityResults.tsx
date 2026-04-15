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
} from '@pluralsh/design-system'
import {
  SimpleAccordion,
  SimplifiedMarkdown,
} from 'components/ai/chatbot/multithread/MultiThreadViewerMessage'
import { LogLine } from 'components/cd/logs/LogLine'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import DiffViewer from 'components/utils/DiffViewer'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Body2P } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityMetricFragment,
  WorkbenchJobActivityResultFragment,
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
  ...props
}: {
  logs: WorkbenchJobActivityLogFragment[]
} & FlexProps) {
  if (isEmpty(logs)) return null

  return (
    <Flex
      direction="column"
      {...props}
    >
      {logs.map((log, i) => (
        <LogLine
          key={i}
          line={{ log: log.message, timestamp: log.timestamp }}
        />
      ))}
    </Flex>
  )
}

const CANVAS_THRESHOLD = 1000

export function JobActivityMetrics({
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
    const grouped = groupBy(metrics, (m) => m.name ?? 'metric')
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
            style={{ width: 12 }}
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
