import { Tab, TabList } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  CloudAddonFragment,
  ClusterDistro,
  ClusterFragment,
  RuntimeServiceFragment,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'
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
import { LinkTabWrap } from '../../utils/Tabs'
import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'

import { POLL_INTERVAL } from '../ContinuousDeployment'
import ClusterAddOnsEntry from './ClusterAddOnsEntry'
import { useClusterContext } from './Cluster.tsx'

export type AddonContextType = {
  cluster: ClusterFragment
  cloudAddon?: CloudAddonFragment
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
  const { cluster } = useClusterContext()
  const kubeVersion = getClusterKubeVersion(cluster)
  const tabStateRef = useRef<any>(null)
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
  const isCloudAddon = currentTab?.path !== CLUSTER_ALL_ADDONS_REL_PATH

  const { data, error } = useRuntimeServicesQuery({
    variables: { kubeVersion, hasKubeVersion: !!kubeVersion, id: clusterId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

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

  const hasAddons = !isEmpty(addOns)

  const supportsCloudAddons = cluster.distro === ClusterDistro.Eks

  useEffect(() => {
    if (hasAddons && !addOnId)
      navigate(
        getClusterAddOnDetailsPath({
          clusterId,
          addOnId: addOns[0].id,
          isCloudAddon,
        })
      )
  }, [addOns, addOnId, navigate, clusterId, hasAddons, isCloudAddon])

  const context = useMemo(
    () =>
      ({
        cluster,
        cloudAddon: isCloudAddon ? addOn : undefined, // Update once there is a separate query to get a single cloud addon.
      }) as AddonContextType,
    [addOn, cluster, isCloudAddon]
  )

  if (error) return <GqlError error={error} />

  if (!data) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        css={{
          height: '100%',
          marginRight: theme.spacing.medium,
          maxWidth: 320,
          minWidth: 320,
          overflow: 'hidden',
        }}
      >
        {supportsCloudAddons && (
          <TabList
            stateRef={tabStateRef}
            stateProps={{
              orientation: 'horizontal',
              selectedKey: currentTab?.path,
            }}
          >
            {directory.map(({ path, label }) => (
              <LinkTabWrap
                key={path}
                textValue={label}
                to={path}
                css={{ width: '100%' }}
              >
                <Tab key={path}>
                  <div css={{ textAlign: 'center', width: '100%' }}>
                    {label}
                  </div>
                </Tab>
              </LinkTabWrap>
            ))}
          </TabList>
        )}
        <div
          css={{
            borderTop: supportsCloudAddons ? undefined : theme.borders.default,
            flexShrink: 0,
            overflowY: 'auto',
            height: '100%',
          }}
        >
          {hasAddons ? (
            addOns.map((addon: RuntimeServiceFragment | CloudAddonFragment) => (
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
              />
            ))
          ) : (
            <div
              css={{
                border: theme.borders.default,
                borderTop: 'none',
                padding: theme.spacing.xlarge,
                textAlign: 'center',
              }}
            >{`No ${isCloudAddon ? 'cloud ' : ''}add-ons found.`}</div>
          )}
        </div>
      </div>
      {addOn && <Outlet context={context} />}
    </div>
  )
}
