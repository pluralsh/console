import { ResponsiveLine } from '@nivo/line'
import { Button, FileDiffIcon, IconFrame, Modal } from '@pluralsh/design-system'
import { LogLine } from 'components/cd/logs/LogLine'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import DiffViewer from 'components/utils/DiffViewer'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body2P } from 'components/utils/typography/Text'
import {
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityLogFragment,
  WorkbenchJobActivityMetricFragment,
} from 'generated/graphql'
import { groupBy, isEmpty, isNil } from 'lodash'
import { useMemo, useState } from 'react'
import { DiffMethod } from 'react-diff-viewer'
import styled from 'styled-components'
import { COLORS } from 'utils/color'
import { toDateOrUndef } from 'utils/datetime'
import { getOldContentFromTextDiff } from 'utils/textDiff'

type ActivityResult = NonNullable<WorkbenchJobActivityFragment['result']>

export function MemoActivityResult({
  result: { jobUpdate, output },
}: {
  result: ActivityResult
}) {
  const [showDiff, setShowDiff] = useState(false)

  const newValue = jobUpdate?.workingTheory ?? jobUpdate?.conclusion ?? ''
  const oldValue = useMemo(
    () => getOldContentFromTextDiff(newValue, jobUpdate?.diff),
    [newValue, jobUpdate?.diff]
  )

  return (
    <StretchedFlex gap="medium">
      <Body2P $color="text-xlight">{output}</Body2P>
      {!!jobUpdate?.diff && (
        <>
          <IconFrame
            clickable
            icon={<FileDiffIcon color="icon-light" />}
            size="small"
            tooltip="View diff"
            onClick={() => setShowDiff(true)}
          />
          <Modal
            header={`Updated ${jobUpdate?.workingTheory ? 'working theory' : 'conclusion'}`}
            size="auto"
            open={showDiff}
            onClose={() => setShowDiff(false)}
            actions={
              <Button
                secondary
                onClick={() => setShowDiff(false)}
              >
                Close
              </Button>
            }
          >
            <DiffViewer
              compareMethod={DiffMethod.WORDS}
              oldValue={oldValue}
              newValue={newValue}
            />
          </Modal>
        </>
      )}
    </StretchedFlex>
  )
}

export function JobActivityLogs({
  logs,
}: {
  logs: WorkbenchJobActivityLogFragment[]
}) {
  if (isEmpty(logs)) return null

  return logs.map((log, i) => (
    <LogLine
      key={i}
      line={{ log: log.message, timestamp: log.timestamp }}
    />
  ))
}

export function JobActivityMetrics({
  metrics,
}: {
  metrics: WorkbenchJobActivityMetricFragment[]
}) {
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

  return (
    <MetricsChartSC>
      <ResponsiveLine
        theme={graphTheme}
        data={graphData}
        tooltip={SliceTooltip}
        colors={COLORS}
        margin={{ top: 10, right: 20, bottom: 30, left: 30 }}
        xScale={{ type: 'time', format: 'native' }}
        yScale={{ type: 'linear', min: 0, max: 'auto' }}
        xFormat={dateFormat}
        curve="monotoneX"
        lineWidth={1}
        enablePoints={false}
        useMesh
        axisBottom={{ format: '%H:%M:%S', tickRotation: 10 }}
      />
    </MetricsChartSC>
  )
}

const MetricsChartSC = styled.div(() => ({
  height: 160,
  width: '100%',
}))
