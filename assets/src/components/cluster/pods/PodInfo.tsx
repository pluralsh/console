import { useQuery } from '@apollo/client'
import { Link, useParams } from 'react-router-dom'
import { Flex } from 'honorable'
import { Button, LogsIcon } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ContainerStatus, Maybe, Pod } from 'generated/graphql'
import { asQuery } from 'components/utils/query'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../constants'
import { POD_INFO_Q } from '../queries'
import { SubTitle } from '../nodes/SubTitle'
import { ContainersList } from '../containers/ContainersList'

import { useNamespaceIsApp } from '../../hooks/useNamespaceIsApp'

import PodMetadata from './PodMetadata'
import PodConditions from './PodConditions'

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

function useGetLogUrl({
  name,
  namespace,
}: {
  name?: string
  namespace?: string
}) {
  const isApp = useNamespaceIsApp(namespace)

  if (!namespace) {
    return null
  }

  return isApp
    ? `/apps/${namespace}/logs${name ? `?${asQuery({ pod: name })}` : ''}`
    : name
    ? `/pods/${namespace}/${name}/logs`
    : null
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
  const { name, namespace } = useParams()
  const { data } = useQuery<{ pod: Pod }>(POD_INFO_Q, {
    variables: { name, namespace },
    pollInterval: POLL_INTERVAL,
  })

  if (!name || !namespace) {
    return null
  }
  if (!data) return <LoadingIndicator />

  const { pod } = data
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
            namespace={namespace}
            podName={name}
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
