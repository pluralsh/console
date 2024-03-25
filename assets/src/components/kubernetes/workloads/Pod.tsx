import { ReactElement } from 'react'
import { useParams } from 'react-router-dom'
import { Flex } from 'honorable'

import { KubernetesClient } from '../../../helpers/kubernetes.client'
import {
  PodQueryVariables,
  usePodQuery,
} from '../../../generated/graphql-kubernetes'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { ScrollablePage } from '../../utils/layout/ScrollablePage'
import { SubTitle } from '../../cluster/nodes/SubTitle'

export default function Pod(): ReactElement {
  const { clusterId, name, namespace } = useParams()
  const { data, loading } = usePodQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as PodQueryVariables,
  })

  const pod = data?.handleGetPodDetail
  const containers = pod?.containers
  const conditions = pod?.conditions

  if (loading) {
    return <LoadingIndicator />
  }

  return (
    <ScrollablePage
      heading="Info"
      // headingContent={<ViewLogsButton metadata={pod?.metadata} />}
    >
      <Flex
        direction="column"
        gap="xlarge"
      >
        <section>
          <SubTitle>Containers</SubTitle>
          {/* <ContainersList */}
          {/*  containers={containers} */}
          {/*  containerStatuses={containerStatuses} */}
          {/*  initContainers={initContainers} */}
          {/*  initContainerStatuses={initContainerStatuses} */}
          {/*  namespace={pod?.objectMeta.namespace ?? ''} */}
          {/*  podName={pod?.objectMeta.name ?? ''} */}
          {/* /> */}
        </section>
        <section>
          <SubTitle>Conditions</SubTitle>
          {/* <PodConditions conditions={conditions} /> */}
        </section>
        <section>
          <SubTitle>Metadata</SubTitle>
          {/* <PodMetadata pod={pod} /> */}
        </section>
      </Flex>
    </ScrollablePage>
  )
}
