import { Button, Flex, LogsIcon } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ContainerStatus, Maybe, Pod } from 'generated/graphql'
import { Link, useOutletContext, useParams } from 'react-router-dom'

import { SubTitle } from '../../../utils/SubTitle'

import { Readiness } from '../../../../utils/status'
import { PodConditions } from './PodConditions.tsx'
import {
  ColCpuReservation,
  ColExpander,
  ColImage,
  ColMemoryReservation,
  ColName,
  ColPorts,
  ColStatus,
  columnHelper,
  PodContainers,
  ShellLink,
} from './PodContainers.tsx'
import { PodMetadata } from './PodMetadata.tsx'
import { useTheme } from 'styled-components'
import { getPodDetailsPath } from 'routes/cdRoutesConsts.tsx'

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
              ? `${getPodDetailsPath({
                  type: 'service',
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
  const { spacing } = useTheme()
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
        paddingBottom={spacing.large}
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
