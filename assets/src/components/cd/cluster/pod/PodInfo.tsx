import { Link, useOutletContext, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ContainerStatus, Maybe, Pod } from 'generated/graphql'
import { Button, LogsIcon } from '@pluralsh/design-system'

import { SubTitle } from '../../../utils/SubTitle'

import { Readiness } from '../../../../utils/status'
import { getServicePodDetailsPath } from '../../../../routes/cdRoutesConsts'
import { PodConditions } from './PodConditions.tsx'
import { PodMetadata } from './PodMetadata.tsx'
import {
  ColCpuReservation,
  ColImage,
  ColMemoryReservation,
  ColName,
  ColPorts,
  ColStatus,
  ShellLink,
  columnHelper,
  ColExpander,
  PodContainers,
} from './PodContainers.tsx'

export const statusesToRecord = (statuses?: Maybe<Maybe<ContainerStatus>[]>) =>
  (statuses || []).reduce(
    (acc, container) => ({
      ...acc,
      ...(typeof container?.name === 'string'
        ? { [container.name]: container }
        : {}),
    }),
    {} as Record<string, Maybe<ContainerStatus>>
  )

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
    const { serviceId, clusterId, namespace, podName } = table.options
      .meta as any

    return (
      readiness &&
      readiness === Readiness.Ready && (
        <ShellLink
          to={
            serviceId
              ? `${getServicePodDetailsPath({
                  clusterId,
                  serviceId,
                  name: podName,
                  namespace,
                })}/shell?container=${name}`
              : `/cd/clusters/${clusterId}/pods/${namespace}/${podName}/shell?container=${name}`
          }
          textValue={`Launch ${name} shell`}
        />
      )
    )
  },
  header: '',
})

const columns = [
  ColExpander,
  ColName,
  ColImage,
  ColMemoryReservation,
  ColCpuReservation,
  ColPorts,
  ColStatus,
  ColActions,
]

// It's used by multiple routes.
export default function PodInfo() {
  const { clusterId, serviceId } = useParams()
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
        paddingBottom="large"
      >
        <section>
          <SubTitle>Containers</SubTitle>
          <PodContainers
            containers={containers}
            containerStatuses={containerStatuses}
            initContainers={initContainers}
            initContainerStatuses={initContainerStatuses}
            clusterId={clusterId}
            serviceId={serviceId}
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
          <PodMetadata pod={pod} />
        </section>
      </Flex>
    </ScrollablePage>
  )
}
