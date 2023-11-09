import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'
import { statusesToRecord } from 'components/cluster/pods/PodInfo'

import { Button, LogsIcon } from '@pluralsh/design-system'

import { useMemo } from 'react'

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

export const ColActions = ({
  clusterId,
  podName,
  namespace,
}: {
  clusterId?: string
  podName?: string
  namespace?: string
}) =>
  columnHelper.display({
    id: 'actions',
    cell: ({
      row: {
        original: { name, readiness },
      },
    }: any) =>
      readiness &&
      readiness === Readiness.Ready && (
        <ShellLink
          to={`/cd/clusters/${clusterId}/pods/${namespace}/${podName}/shell?container=${name}`}
          textValue={`Launch ${name} shell`}
        />
      ),
    header: '',
  })

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
  const columns = useMemo(
    () => [
      ColName,
      ColImage,
      ColMemoryReservation,
      ColCpuReservation,
      ColPorts,
      ColStatus,
      ColActions({
        clusterId,
        podName: pod.metadata.name,
        namespace: pod.metadata.namespace || '',
      }),
    ],
    [pod]
  )

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
