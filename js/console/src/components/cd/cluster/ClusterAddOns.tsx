import {
  PageSidebarHeaderSC,
  PageSidebarSC,
} from 'components/layout/PageLayout'
import { ToolbarTabs } from 'components/layout/PageToolbar'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  CloudAddonFragment,
  ClusterDistro,
  ClusterFragment,
  RuntimeServiceFragment,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useLayoutEffect, useMemo } from 'react'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  CLUSTER_ADDONS_PARAM_ID,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_ALL_ADDONS_REL_PATH,
  CLUSTER_CLOUD_ADDONS_REL_PATH,
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
  getClusterDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { GqlError } from '../../utils/Alert'
import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'

import { POLL_INTERVAL } from '../ContinuousDeployment'
import { ClusterSidebarPortal, useClusterContext } from './Cluster.tsx'
import ClusterAddOnsEntry from './ClusterAddOnsEntry'

export type AddonContextType = {
  cluster: Nullable<ClusterFragment>
  cloudAddon?: CloudAddonFragment
  loading?: boolean
}

export function useAddonsContext() {
  return useOutletContext<AddonContextType>()
}

const directory = [
  { path: CLUSTER_ALL_ADDONS_REL_PATH, label: 'Add-ons' },
  { path: CLUSTER_CLOUD_ADDONS_REL_PATH, label: 'Cloud add-ons' },
]

export default function ClusterAddOns() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { cluster, clusterLoading } = useClusterContext()
  const kubeVersion = getClusterKubeVersion(cluster) ?? ''
  const params = useParams()
  const addOnId = params[CLUSTER_ADDONS_PARAM_ID] as string
  const clusterId = params[CLUSTER_PARAM_ID] as string
  const pathMatch = useMatch(
    `${getClusterDetailsPath({
      clusterId,
    })}/${CLUSTER_ADDONS_REL_PATH}/:tab/*`
  )
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)
  const isCloudAddon = currentTab?.path === CLUSTER_CLOUD_ADDONS_REL_PATH

  const { data, loading, error } = useRuntimeServicesQuery({
    variables: { kubeVersion, hasKubeVersion: !!kubeVersion, id: clusterId },
    skip: !kubeVersion,
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const isLoading = (!data && loading) || (!cluster && clusterLoading)

  const addOns: RuntimeServiceFragment[] | CloudAddonFragment[] = useMemo(
    () =>
      (isCloudAddon
        ? data?.cluster?.cloudAddons?.filter(isNonNullable)
        : data?.cluster?.runtimeServices?.filter(isNonNullable)) || [],
    [isCloudAddon, data?.cluster?.cloudAddons, data?.cluster?.runtimeServices]
  )

  const addOn = useMemo(
    () => addOns.find((a) => a.id === addOnId),
    [addOnId, addOns]
  )

  const supportsCloudAddons = cluster?.distro === ClusterDistro.Eks

  useLayoutEffect(() => {
    if (!isEmpty(addOns) && !addOnId)
      navigate(
        getClusterAddOnDetailsPath({
          clusterId,
          addOnId: addOns[0].id,
          isCloudAddon,
        }),
        { replace: true }
      )
  }, [addOns, addOnId, navigate, clusterId, isCloudAddon])

  const context = useMemo(
    () => ({
      cluster,
      cloudAddon: isCloudAddon ? addOn : undefined, // Update once there is a separate query to get a single cloud addon.
      loading: isLoading,
    }),
    [addOn, cluster, isCloudAddon, isLoading]
  )

  if (error) return <GqlError error={error} />

  return (
    <>
      <ClusterSidebarPortal>
        <PageSidebarSC $width={320}>
          <PageSidebarHeaderSC>
            {supportsCloudAddons ? (
              <ToolbarTabs
                directory={directory}
                activeFn={(path) => path === currentTab?.path}
              />
            ) : (
              <Body2BoldP>Add-ons</Body2BoldP>
            )}
          </PageSidebarHeaderSC>
          <ListSC>
            {!isEmpty(addOns) ? (
              addOns.map(
                (addon: RuntimeServiceFragment | CloudAddonFragment) => (
                  <ClusterAddOnsEntry
                    key={addon.id}
                    id={addon.id}
                    name={addon.name}
                    icon={
                      addon.__typename === 'RuntimeService'
                        ? addon.addon?.icon
                        : undefined
                    }
                    blocking={
                      addon.__typename === 'RuntimeService'
                        ? addon.addonVersion?.blocking
                        : addon.__typename === 'CloudAddon'
                          ? addon.versionInfo?.blocking
                          : undefined
                    }
                    active={addon.id === addOnId}
                    cloudAddon={addon.__typename === 'CloudAddon'}
                    loading={loading}
                  />
                )
              )
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <ClusterAddOnsEntry
                  loading
                  key={index}
                  id={`x`.repeat(index)}
                  name=""
                  active={index === 0}
                  cloudAddon={isCloudAddon}
                />
              ))
            ) : (
              <div
                css={{
                  padding: theme.spacing.xlarge,
                  textAlign: 'center',
                }}
              >{`No ${isCloudAddon ? 'cloud ' : ''}add-ons found.`}</div>
            )}
          </ListSC>
        </PageSidebarSC>
      </ClusterSidebarPortal>
      <Outlet context={context} />
    </>
  )
}

const ListSC = styled.div({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
})
