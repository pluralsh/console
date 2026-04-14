import { Code, Flex, Markdown } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { WorkbenchJobFragment } from 'generated/graphql'
import { groupBy, isEmpty } from 'lodash'
import { useState } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  JobActivityMetrics,
  WorkbenchJobMetricsLegend,
} from './WorkbenchJobActivityResults'
import { WorkbenchJobTodos } from './WorkbenchJobTodos'
import { WorkbenchJobTriggerAlert } from './WorkbenchJobTriggerAlert'
import { WorkbenchJobTriggerIssue } from './WorkbenchJobTriggerIssue'

export function WorkbenchJobResult({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const { spacing } = useTheme()
  if (loading)
    return (
      <RectangleSkeleton
        $height={320}
        $width="100%"
        css={{ padding: spacing.large }}
      />
    )

  const conclusion = job?.result?.conclusion
  const workingTheory = job?.result?.workingTheory

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      minHeight={0}
      overflow="auto"
    >
      <WorkbenchJobTriggerAlert alert={job?.alert} />
      <WorkbenchJobTriggerIssue issue={job?.issue} />
      <Subtitle1H1 $color="text">
        {job?.result?.conclusion ? 'Conclusion' : 'Working theory'}
      </Subtitle1H1>
      <Flex
        direction="column"
        overflow="auto"
      >
        <Markdown text={conclusion || workingTheory || 'No output yet.'} />
      </Flex>
      {!isEmpty(job?.result?.todos) && !conclusion && (
        <>
          <Subtitle1H1 $color="text">Agent todos</Subtitle1H1>
          <WorkbenchJobTodos
            loading={loading}
            result={job?.result}
          />
        </>
      )}
    </Flex>
  )
}

export function WorkbenchJobMetrics({
  job,
  loading,
}: {
  job: Nullable<WorkbenchJobFragment>
  loading: boolean
}) {
  const metrics = job?.result?.metadata?.metrics?.filter(isNonNullable) ?? []
  const seriesNames = Object.keys(groupBy(metrics, (m) => m.name ?? 'metric'))

  if (loading)
    return (
      <RectangleSkeleton
        $height={320}
        $width="100%"
      />
    )

  if (isEmpty(metrics)) return null

  return (
    <Flex
      direction="column"
      gap="medium"
      width="100%"
    >
      <JobActivityMetrics
        metrics={metrics}
        css={{ minHeight: 300 }}
        lineProps={{ margin: { top: 20, right: 40, bottom: 40, left: 40 } }}
      />
      <WorkbenchJobMetricsLegend
        seriesNames={seriesNames}
        paddingLeft={20}
      />
    </Flex>
  )
}

export function WorkbenchJobTopology({ topology }: { topology: string }) {
  const [mermaidError, setMermaidError] = useState<Nullable<Error>>(null)
  return (
    <>
      {mermaidError && <GqlError error={mermaidError} />}
      <Code
        language="mermaid"
        showHeader={false}
        setMermaidError={setMermaidError}
      >
        {topology ?? ''}
      </Code>
    </>
  )
}
