import { Link, useOutletContext } from 'react-router-dom'
import { Flex } from 'honorable'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'
import { statusesToRecord } from 'components/cluster/pods/PodInfo'

import { Button, LogsIcon } from '@pluralsh/design-system'

import PodConditions from '../../../cluster/pods/PodConditions'
import Metadata from '../../../cluster/pods/PodMetadata'
import { SubTitle } from '../../../cluster/nodes/SubTitle'
import { ContainersList } from '../../../cluster/containers/ContainersList'

function ViewLogsButton() {
  return (
    <Button
      secondary
      fontWeight={600}
      startIcon={<LogsIcon />}
      as={Link}
      to="logs"
    >
      View logs
    </Button>
  )
}

export default function PodInfo() {
  const { pod } = useOutletContext() as { pod: Pod }
  const containers = pod.spec.containers || []
  const initContainers = pod.spec.initContainers || []
  const containerStatuses = statusesToRecord(pod.status?.containerStatuses)
  const initContainerStatuses = statusesToRecord(
    pod.status?.initContainerStatuses
  )
  const conditions = pod?.status?.conditions || []

  return (
    <ScrollablePage
      heading="Info"
      headingContent={<ViewLogsButton />}
    >
      <Flex
        direction="column"
        gap="xlarge"
      >
        <section>
          <SubTitle>Containers</SubTitle>
          <ContainersList
            containers={containers}
            containerStatuses={containerStatuses}
            initContainers={initContainers}
            initContainerStatuses={initContainerStatuses}
            namespace={pod.metadata.namespace || ''}
            podName={pod.metadata.name}
          />
        </section>
        <section>
          <SubTitle>Conditions</SubTitle>
          <PodConditions conditions={conditions} />
        </section>
        <section>
          <SubTitle>Metadata</SubTitle>
          <Metadata pod={pod} />
        </section>
      </Flex>
    </ScrollablePage>
  )
}
