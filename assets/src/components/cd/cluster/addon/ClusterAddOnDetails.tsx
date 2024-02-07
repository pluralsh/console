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
import { ResponsiveLayoutSidecarContainer } from 'components/utils/layout/ResponsiveLayoutSidecarContainer'
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
  ListBoxItem,
  LoopingLogo,
  Select,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useEffect, useMemo, useState } from 'react'
import isEmpty from 'lodash/isEmpty'

import ClusterAddOnDetailsSidecar from './ClusterAddOnDetailsSidecar'

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

const useGetDirectory = (readme: string | null | undefined) =>
  useMemo(() => {
    const hasReadme = !isEmpty(readme)

    return [
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
        enabled: hasReadme,
      },
    ]
  }, [readme])

export default function ClusterAddOnDetails() {
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
  const runtimeServices = cluster?.runtimeServices
  const kubeVersion = cluster?.currentVersion || cluster?.version || ''

  useEffect(() => setKubeVersionVar(kubeVersion), [kubeVersion])
  const rts = runtimeServices?.find((rts) => rts?.id === addOnId)
  const directory = useGetDirectory(rts?.addon?.readme)

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
  if (!runtimeServices) {
    return <LoopingLogo />
  }

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
          <Select
            selectedKey={rts?.id}
            onSelectionChange={(id) => {
              if (id) {
                navigate(
                  getClusterAddOnDetailsPath({
                    clusterId: cluster?.id,
                    addOnId: id as string,
                  })
                )
              }
            }}
            leftContent={
              rts?.addon?.icon ? (
                <img
                  src={rts?.addon?.icon}
                  css={{ width: theme.spacing.medium }}
                />
              ) : undefined
            }
          >
            {runtimeServices.map((r) => (
              <ListBoxItem
                key={r?.id}
                label={r?.name}
                textValue=""
                leftContent={
                  r?.addon?.icon ? (
                    <img
                      src={r?.addon?.icon}
                      css={{ width: theme.spacing.medium }}
                    />
                  ) : undefined
                }
              />
            ))}
          </Select>
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
      <ResponsiveLayoutSidecarContainer>
        <ClusterAddOnDetailsSidecar
          runtimeService={rts}
          kubeVersion={kubeVersion}
        />
      </ResponsiveLayoutSidecarContainer>
      <ResponsiveLayoutSpacer />
    </ResponsiveLayoutPage>
  )
}

export function useClusterAddOnContext() {
  return useOutletContext<ClusterAddOnContextType>()
}
