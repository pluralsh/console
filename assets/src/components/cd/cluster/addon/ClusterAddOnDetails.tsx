import {
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import {
  RuntimeServiceFragment,
  useClusterQuery,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { useTheme } from 'styled-components'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import {
  CLUSTER_ADDONS_PARAM_ID,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
  getClusterDetailsPath,
} from 'routes/cdRoutesConsts'
import { SideNavEntries } from 'components/layout/SideNavEntries'

import { getClusterBreadcrumbs } from 'components/cd/cluster/Cluster'

import { POLL_INTERVAL } from 'components/cluster/constants'

import { getClusterKubeVersion } from 'components/cd/clusters/runtime/RuntimeServices'

import ClusterAddOnDetailsSidecar from './ClusterAddOnDetailsSidecar'

type AddOnContextType = {
  addOn: RuntimeServiceFragment
}

export const useServiceContext = () => useOutletContext<AddOnContextType>()

export const getAddOnDetailsBreadcrumbs = ({
  cluster,
  addOn,
}: Parameters<typeof getClusterBreadcrumbs>[0] & {
  addOn: Pick<RuntimeServiceFragment, 'name' | 'id'>
}) => [
  ...getClusterBreadcrumbs({ cluster }),
  {
    label: CLUSTER_ADDONS_REL_PATH,
    url: `${getClusterDetailsPath({
      clusterId: cluster.id,
    })}/${CLUSTER_ADDONS_REL_PATH}`,
  },
  ...(addOn.id && cluster.id
    ? [
        {
          label: addOn?.name || addOn?.id,
          url: getClusterAddOnDetailsPath({
            clusterId: cluster.id,
            addOnId: addOn.id,
          }),
        },
      ]
    : []),
]

const DIRECTORY = [
  {
    path: 'compatibility',
    label: 'Compatibility',
    enabled: true,
  },
]

export default function ClusterAddOnDetails() {
  const theme = useTheme()
  const { pathname } = useLocation()
  const params = useParams()
  const addOnId = params[CLUSTER_ADDONS_PARAM_ID] as string
  const clusterId = params[CLUSTER_PARAM_ID] as string
  const pathPrefix = getClusterAddOnDetailsPath({
    clusterId,
    addOnId,
  })
  const { data } = useClusterQuery({
    variables: { id: clusterId || '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })
  const cluster = data?.cluster
  const kubeVersion = getClusterKubeVersion(cluster)

  const { data: rtsData, error: rtsError } = useRuntimeServicesQuery({
    variables: { kubeVersion, id: clusterId },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const rts = rtsData?.cluster?.runtimeServices?.find(
    (rts) => rts?.id === addOnId
  )

  const directory = DIRECTORY

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            rowGap: theme.spacing.medium,
            overflow: 'hidden',
            maxHeight: '100%',
          }}
        >
          <div
            css={{
              overflowY: 'auto',
              paddingBottom: theme.spacing.medium,
            }}
          >
            <SideNavEntries
              directory={directory}
              pathname={pathname}
              pathPrefix={pathPrefix}
            />
          </div>
        </div>
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        {rtsError ? (
          <GqlError error={rtsError} />
        ) : rts ? (
          <Outlet
            context={
              {
                addOn: rts,
              } satisfies AddOnContextType
            }
          />
        ) : (
          <LoadingIndicator />
        )}
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer>
        <ClusterAddOnDetailsSidecar runtimeService={rts} />
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}
