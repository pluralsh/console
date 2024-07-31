import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import { ResponsiveLayoutSidenavContainer } from 'components/utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from 'components/utils/layout/ResponsiveLayoutSpacer'
import { ResponsiveLayoutContentContainer } from 'components/utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutPage } from 'components/utils/layout/ResponsiveLayoutPage'
import {
  RuntimeServiceFragment,
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
import {
  LoopingLogo,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useState } from 'react'

import { isNonNullable } from '../../../../utils/isNonNullable'

import ClusterSelector from '../../utils/ClusterSelector'

import { TabularNumbers } from '../../../cluster/TableElements'

import { toNiceVersion } from '../../../../utils/semver'

import ClusterAddOnEntry from './ClusterAddOnEntry'

type ClusterAddOnContextType = {
  runtimeService: RuntimeServiceFragment
  kubeVersion: Nullable<string>
}

export const useServiceContext = () =>
  useOutletContext<ClusterAddOnContextType>()

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
  ...(addOn.name && cluster.name
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

const directory = [
  {
    path: 'compatibility',
    label: 'Compatibility',
    enabled: true,
  },
  {
    path: 'releases',
    label: 'Releases',
    enabled: true,
  },
  {
    path: 'readme',
    label: 'Readme',
    enabled: true,
  },
]

export default function ClusterAddOn() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const params = useParams()
  const addOnId = params[CLUSTER_ADDONS_PARAM_ID] as string
  const clusterId = params[CLUSTER_PARAM_ID] as string

  const pathPrefix = getClusterAddOnDetailsPath({
    clusterId,
    addOnId,
  })

  const [kubeVersionVar, setKubeVersionVar] = useState('')

  const { data, error, previousData } = useRuntimeServicesQuery({
    variables: {
      kubeVersion: kubeVersionVar,
      hasKubeVersion: !!kubeVersionVar,
      id: clusterId,
    },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })
  const rtsData = data || previousData
  const cluster = rtsData?.cluster
  const runtimeServices = cluster?.runtimeServices?.filter(isNonNullable)
  const kubeVersion = cluster?.currentVersion || cluster?.version || ''

  useEffect(() => setKubeVersionVar(kubeVersion), [kubeVersion])
  const rts = runtimeServices?.find((rts) => rts?.id === addOnId)

  useSetBreadcrumbs(
    useMemo(
      () =>
        getAddOnDetailsBreadcrumbs({
          cluster: cluster ?? { id: clusterId },
          addOn: rts || { name: '', id: addOnId },
        }),
      [addOnId, cluster, clusterId, rts]
    )
  )
  if (!runtimeServices) return <LoopingLogo />

  return (
    <ResponsiveLayoutPage>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          marginRight: theme.spacing.xlarge,
          minWidth: 320,
          width: 320,
        }}
      >
        <ClusterSelector
          clusterId={clusterId}
          allowDeselect={false}
          onClusterChange={(c) => {
            if (c?.id) navigate(`#`) // nav to first available addon
          }}
        />
        <div
          css={{
            border: theme.borders.default,
            marginBottom: theme.spacing.large,
            overflowY: 'auto',
          }}
        >
          {runtimeServices.map((addon, i) => (
            <ClusterAddOnEntry
              addon={addon}
              active={addon.id === rts?.id}
              last={runtimeServices.length - 1 === i}
            />
          ))}
        </div>
      </div>

      <ResponsiveLayoutSidenavContainer>
        <SideNavEntries
          directory={directory}
          pathname={pathname}
          pathPrefix={pathPrefix}
        />
        {rts?.name && (
          <SidecarItem heading="Add-on name"> {rts.name}</SidecarItem>
        )}
        <SidecarItem heading="Add-on version">
          <TabularNumbers
            css={{
              ...theme.partials.text.body2,
            }}
          >
            {toNiceVersion(rts?.addonVersion?.version)}
          </TabularNumbers>
          <br />
        </SidecarItem>
        {kubeVersion && (
          <SidecarItem heading="Kubernetes version">
            <TabularNumbers>{toNiceVersion(kubeVersion)}</TabularNumbers>
          </SidecarItem>
        )}
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer role="main">
        {error ? (
          <GqlError error={error} />
        ) : rts ? (
          <Outlet
            context={
              {
                runtimeService: rts,
                kubeVersion,
              } satisfies ClusterAddOnContextType
            }
          />
        ) : (
          <LoadingIndicator />
        )}
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}

export function useClusterAddOnContext() {
  return useOutletContext<ClusterAddOnContextType>()
}
