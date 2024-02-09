import { Card, Code } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { PropWideBold } from 'components/component/info/common'

import { usePipelineJob } from './PipelineJob'

export default function PipelineJobStatus() {
  const theme = useTheme()
  const { status, raw, spec } = usePipelineJob()

  return (
    <ScrollablePage heading="Specs">
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xlarge,
        }}
      >
        {status?.active}
        <Card
          css={{
            display: 'flex',
            padding: theme.spacing.xlarge,
            gap: theme.spacing.xsmall,
            flexDirection: 'column',
          }}
        >
          <PropWideBold title="Active">{status?.active || 0}</PropWideBold>
          <PropWideBold title="Succeeded">{status?.succeeded}</PropWideBold>
          <PropWideBold title="Failed">{status?.failed || 0}</PropWideBold>
          <PropWideBold title="Start time">{status?.startTime}</PropWideBold>
          <PropWideBold title="Completion time">
            {status?.completionTime}
          </PropWideBold>
        </Card>
        <Code>{raw || ''}</Code>
      </div>
    </ScrollablePage>
  )
}
