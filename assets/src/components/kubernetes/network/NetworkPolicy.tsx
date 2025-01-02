import { ReactElement, useMemo } from 'react'
import {
  ChipList,
  Code,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Outlet, useOutletContext, useParams } from 'react-router-dom'

import {
  NetworkPolicyQueryVariables,
  Networkpolicy_NetworkPolicyDetail as NetworkPolicyT,
  useNetworkPolicyQuery,
} from '../../../generated/graphql-kubernetes'
import { KubernetesClient } from '../../../helpers/kubernetes.client'
import LoadingIndicator from '../../utils/LoadingIndicator'
import { MetadataSidecar, useCodeTabs } from '../common/utils'
import { NAMESPACE_PARAM } from '../Navigation'
import {
  NETWORK_POLICIES_REL_PATH,
  getNetworkAbsPath,
  getResourceDetailsAbsPath,
} from '../../../routes/kubernetesRoutesConsts'
import ResourceDetails, { TabEntry } from '../common/ResourceDetails'
import { SubTitle } from '../../utils/SubTitle'

import { useCluster } from '../Cluster'

import { Kind } from '../common/types'

import { getBreadcrumbs } from './Services'

const directory: Array<TabEntry> = [
  { path: '', label: 'Info' },
  { path: 'raw', label: 'Raw' },
] as const

export default function NetworkPolicy(): ReactElement<any> {
  const cluster = useCluster()
  const { clusterId, name = '', namespace = '' } = useParams()
  const { data, loading } = useNetworkPolicyQuery({
    client: KubernetesClient(clusterId ?? ''),
    skip: !clusterId,
    pollInterval: 30_000,
    variables: {
      name,
      namespace,
    } as NetworkPolicyQueryVariables,
  })

  const np = data?.handleGetNetworkPolicyDetail

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getBreadcrumbs(cluster),
        {
          label: namespace ?? '',
          url: `${getNetworkAbsPath(
            cluster?.id
          )}/${NETWORK_POLICIES_REL_PATH}?${NAMESPACE_PARAM}=${namespace}`,
        },
        {
          label: name ?? '',
          url: getResourceDetailsAbsPath(
            clusterId,
            Kind.NetworkPolicy,
            name,
            namespace
          ),
        },
      ],
      [cluster, clusterId, name, namespace]
    )
  )

  if (loading) return <LoadingIndicator />

  return (
    <ResourceDetails
      tabs={directory}
      sidecar={
        <MetadataSidecar resource={np}>
          <SidecarItem heading="Pod selector">
            <ChipList
              size="small"
              limit={3}
              values={Object.entries(np?.podSelector?.matchLabels)}
              transformValue={(label) => label.join(': ')}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
          <SidecarItem heading="Policy types">
            <ChipList
              size="small"
              limit={3}
              values={np?.policyTypes ?? []}
              emptyState={<div>-</div>}
            />
          </SidecarItem>
        </MetadataSidecar>
      }
    >
      <Outlet context={np} />
    </ResourceDetails>
  )
}

export function NetworkPolicyInfo(): ReactElement<any> {
  const np = useOutletContext() as NetworkPolicyT
  const ingressTabs = useCodeTabs(np.ingress)
  const egressTabs = useCodeTabs(np.egress)

  return (
    <>
      <section>
        <SubTitle>Ingress rules</SubTitle>
        <Code
          tabs={ingressTabs}
          height="300px"
        />
      </section>
      <section>
        <SubTitle>Egress rules</SubTitle>
        <Code
          tabs={egressTabs}
          height="300px"
        />
      </section>
    </>
  )
}
