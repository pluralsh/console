import { Code, EmptyState, Flex } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'
import { SentinelRunJobOutletCtxT } from './SentinelRunJob'
import { SentinelRunJobFormat } from 'generated/graphql'
import { parseJunit } from 'utils/junitParse'
import { GqlError } from 'components/utils/Alert'
import { JUnitTable } from 'components/utils/junit/JUnitTable'
import { JUnitSuitesMetadata } from 'components/utils/junit/JUnitSuitesMetadata'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'

export function SentinelRunJobOutput() {
  const { job, isLoading } = useOutletContext<SentinelRunJobOutletCtxT>()

  if (isLoading)
    return (
      <RectangleSkeleton
        $width="100%"
        $height="xxxxxxlarge"
      />
    )
  if (!job?.output)
    return <EmptyState message="No output available yet for this job." />
  if (job?.format === SentinelRunJobFormat.Junit) {
    const parsedJunit = parseJunit(job.output)

    if (!parsedJunit) return <GqlError error="Failed to parse JUnit output" />
    return (
      <Flex
        direction="column"
        gap="large"
        height="100%"
        overflow="auto"
      >
        <JUnitSuitesMetadata testSuites={parsedJunit} />
        <JUnitTable testSuites={parsedJunit} />
      </Flex>
    )
  }
  return <Code css={{ overflow: 'auto' }}>{job.output}</Code>
}
