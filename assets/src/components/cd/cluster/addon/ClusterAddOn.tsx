import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
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
import { getClusterBreadcrumbs } from 'components/cd/cluster/Cluster'
import { POLL_INTERVAL } from 'components/cluster/constants'
import {
  LoopingLogo,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useRef, useState } from 'react'

import { isNonNullable } from '../../../../utils/isNonNullable'
import ClusterSelector from '../../utils/ClusterSelector'
import { toNiceVersion } from '../../../../utils/semver'
import { LinkTabWrap } from '../../../utils/Tabs'
import { PropCard } from '../../globalServices/details/GlobalServiceInfo'

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
  },
  {
    path: 'releases',
    label: 'Releases',
  },
  {
    path: 'readme',
    label: 'README',
  },
]

export default function ClusterAddOn() {
  const theme = useTheme()
  const navigate = useNavigate()
  const params = useParams()
  const addOnId = params[CLUSTER_ADDONS_PARAM_ID] as string
  const clusterId = params[CLUSTER_PARAM_ID] as string

  const pathPrefix = getClusterAddOnDetailsPath({
    clusterId,
    addOnId,
  })
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(
    `${getClusterAddOnDetailsPath({ clusterId, addOnId })}/:tab`
  )
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

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
      <div>
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: currentTab?.path,
          }}
          marginRight="medium"
          paddingBottom="medium"
          minHeight={56}
        >
          {directory.map(({ label, path }) => (
            <LinkTabWrap
              subTab
              key={path}
              textValue={label}
              to={`${pathPrefix}/${path}`}
            >
              <SubTab
                key={path}
                textValue={label}
              >
                {label}
              </SubTab>
            </LinkTabWrap>
          ))}
        </TabList>
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: 'min-content',
            gridGap: theme.spacing.small,
          }}
        >
          <PropCard title="Add-on">{rts?.name}</PropCard>
          <PropCard title="Add-on version">{rts?.name}</PropCard>
          <PropCard title="Kubernetes version">
            {toNiceVersion(kubeVersion)}
          </PropCard>
        </div>
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
      </div>
    </ResponsiveLayoutPage>
  )
}

export function useClusterAddOnContext() {
  return useOutletContext<ClusterAddOnContextType>()
}
