import { Card } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { LabelPairsSection } from 'components/utils/LabelPairsSection'
import { PropWideBold } from 'components/component/info/common'

import { useRunJob } from './RunJob'

export function RunJobStatus() {
  const theme = useTheme()
  const { status, metadata } = useRunJob()

  return (
    <ScrollablePage heading="Status">
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
          <PropWideBold title="Succeeded">
            {status?.succeeded || 0}
          </PropWideBold>
          <PropWideBold title="Failed">{status?.failed || 0}</PropWideBold>
          <PropWideBold title="Start time">{status?.startTime}</PropWideBold>
          <PropWideBold title="Completion time">
            {status?.completionTime}
          </PropWideBold>
        </Card>
        <section>
          <Card
            css={{
              display: 'flex',
              padding: theme.spacing.xlarge,
              gap: theme.spacing.large,
              flexDirection: 'column',
            }}
          >
            <LabelPairsSection
              vals={metadata?.labels || []}
              title="Labels"
            />
            <LabelPairsSection
              vals={metadata?.annotations || []}
              title="Annotations"
            />
          </Card>
        </section>
      </div>
    </ScrollablePage>
  )
}
