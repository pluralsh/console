import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'
import { statusesToRecord } from 'components/cluster/pods/PodInfo'
import { Button, LogsIcon } from '@pluralsh/design-system'

import PodConditions from '../../../cluster/pods/PodConditions'
import Metadata from '../../../cluster/pods/PodMetadata'
import { SubTitle } from '../../../cluster/nodes/SubTitle'
import {
  ColCpuReservation,
  ColImage,
  ColMemoryReservation,
  ColName,
  ColPorts,
  ColStatus,
  ContainersList,
  ShellLink,
  columnHelper,
} from '../../../cluster/containers/ContainersList'
import { Readiness } from '../../../../utils/status'

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

export const ColActions = columnHelper.display({
  id: 'actions',
  cell: ({
    table,
    row: {
      original: { name, readiness },
    },
  }: any) => {
    const { clusterId, namespace, podName } = table.options.meta as any

    return (
      readiness &&
      readiness === Readiness.Ready && (
        <ShellLink
          to={`/cd/clusters/${clusterId}/pods/${namespace}/${podName}/shell?container=${name}`}
          textValue={`Launch ${name} shell`}
        />
      )
    )
  },
  header: '',
})

const columns = [
  ColName,
  ColImage,
  ColMemoryReservation,
  ColCpuReservation,
  ColPorts,
  ColStatus,
  ColActions,
]

export default function PodInfo() {
  const { clusterId } = useParams()
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
            clusterId={clusterId}
            namespace={pod.metadata.namespace || ''}
            podName={pod.metadata.name}
            columns={columns}
            rowLink={false}
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
