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
import { useNamespaceIsApp } from '../../../hooks/useNamespaceIsApp'
import { asQuery } from '../../../utils/query'

function useGetLogUrl({
  name,
  namespace,
}: {
  name?: string
  namespace?: string
}) {
  if (!namespace) {
    return null
  }

  // /cd/clusters/da6fcb3c-ef8d-4042-a821-77a2efe6ad14/pods/plrl-deploy-operator/deployment-operator-848df85f5b-4sz28/logs
  return `logs/deployment-operator`
}

function ViewLogsButton({ metadata }: any) {
  const url = useGetLogUrl(metadata)

  if (!url) return null

  return (
    <Button
      secondary
      fontWeight={600}
      startIcon={<LogsIcon />}
      as={Link}
      to={url}
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
      headingContent={<ViewLogsButton metadata={pod?.metadata} />}
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
