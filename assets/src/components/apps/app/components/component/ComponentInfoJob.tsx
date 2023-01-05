import { Card } from '@pluralsh/design-system'
import PropWide from 'components/utils/PropWide'
import { Flex, H2 } from 'honorable'
import { useOutletContext } from 'react-router-dom'

export default function ComponentInfoJob() {
  const { data } = useOutletContext<any>()

  if (!data?.job) return null

  const { job } = data

  return (
    <Flex direction="column">
      <H2 marginBottom="medium">Status</H2>
      <Card padding="large">
        <PropWide
          title="Active"
          fontWeight={600}
        >
          {job?.status?.active || 0}
        </PropWide>
        <PropWide
          title="Succeeded"
          fontWeight={600}
        >
          {job?.status?.succeeded || 0}
        </PropWide>
        <PropWide
          title="Failed"
          fontWeight={600}
        >
          {job?.status?.failed || 0}
        </PropWide>
        <PropWide
          title="Completion time"
          fontWeight={600}
        >
          {job?.status?.completionTime || '-'}
        </PropWide>
        <PropWide
          title="Start time"
          fontWeight={600}
        >
          {job?.status?.startTime || '-'}
        </PropWide>
      </Card>
      <H2 marginBottom="medium">Spec</H2>
      <Card padding="large">
        <PropWide
          title="Backoff limit"
          fontWeight={600}
        >
          {job?.spec?.backoffLimit || 0}
        </PropWide>
        <PropWide
          title="Parallelism"
          fontWeight={600}
        >
          {job?.spec?.parallelism || 0}
        </PropWide>
        <PropWide
          title="Deadline"
          fontWeight={600}
        >
          {job?.spec?.activeDeadlineSeconds || 0}
        </PropWide>
      </Card>
    </Flex>
  )
}
