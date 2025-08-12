import { InsightsTabLabel } from 'components/utils/AiInsights'
import { AiInsightSummaryFragment } from 'generated/graphql'
import { ReactNode } from 'react'

export const getDirectory = (
  insight: Nullable<AiInsightSummaryFragment>
): {
  label: ReactNode
  path: string
  prometheus?: boolean
  onlyFor?: string[]
  onlyIfDryRun?: boolean
  onlyIfNoError?: boolean
}[] => [
  {
    label: 'Info',
    path: 'info',
    onlyIfNoError: true,
  },
  {
    label: 'Raw',
    path: 'raw',
    onlyIfNoError: true,
  },
  {
    label: <InsightsTabLabel insight={insight} />,
    path: 'insights',
  },
  {
    label: 'Metrics',
    path: 'metrics',
    onlyFor: ['deployment', 'statefulset'],
    onlyIfNoError: true,
    prometheus: true,
  },
  {
    label: 'Events',
    path: 'events',
    onlyIfNoError: true,
  },
  {
    label: 'Dry run',
    path: 'dryrun',
    onlyIfDryRun: true,
  },
  {
    label: 'Metadata',
    path: 'metadata',
  },
]
