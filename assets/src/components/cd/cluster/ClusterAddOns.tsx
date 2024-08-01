import { Chip, EmptyState, SubTab, TabList } from '@pluralsh/design-system'
import React, { useEffect, useMemo, useRef } from 'react'
import { Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import {
  RuntimeServiceFragment,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useTheme } from 'styled-components'
import { isEmpty } from 'lodash'

import { POLL_INTERVAL, useSetPageHeaderContent } from '../ContinuousDeployment'
import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'
import { LinkTabWrap } from '../../utils/Tabs'
import { PropCard } from '../globalServices/details/GlobalServiceInfo'
import { toNiceVersion } from '../../../utils/semver'
import { GqlError } from '../../utils/Alert'
import {
  CLUSTER_ADDONS_PARAM_ID,
  CLUSTER_ADDONS_REL_PATH,
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
  getClusterDetailsPath,
} from '../../../routes/cdRoutesConsts'

import ClusterAddOnsEntry from './ClusterAddOnsEntry'
import { getClusterBreadcrumbs, useClusterContext } from './Cluster'

export type ClusterAddOnOutletContextT = {
  addOn: Nullable<RuntimeServiceFragment>
  kubeVersion: Nullable<string>
}

const directory = [
  { path: 'compatibility', label: 'Compatibility' },
  { path: 'releases', label: 'Releases' },
  { path: 'readme', label: 'README' },
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
  const pathPrefix = getClusterAddOnDetailsPath({
    clusterId,
    addOnId,
  })
  const pathMatch = useMatch(
    `${getClusterAddOnDetailsPath({ clusterId, addOnId })}/:tab`
  )
  const tab = pathMatch?.params?.tab || ''
  const currentTab = directory.find(({ path }) => path === tab)

  const { data, error } = useRuntimeServicesQuery({
    variables: { kubeVersion, hasKubeVersion: !!kubeVersion, id: clusterId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const addOns = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  const hasAddons = !isEmpty(addOns)

  const addOn = useMemo(
    () => addOns?.find((a) => a?.id === addOnId),
    [addOnId, addOns]
  )

  const context = useMemo(
    () =>
      ({
        addOn,
        kubeVersion,
      }) satisfies ClusterAddOnOutletContextT,
    [addOn, kubeVersion]
  )

  // useSetBreadcrumbs(
  //   useMemo(
  //     () =>
  //       getAddOnDetailsBreadcrumbs({
  //         cluster: cluster ?? { id: clusterId },
  //         addOn: rts || { name: '', id: addOnId },
  //       }),
  //     [addOnId, cluster, clusterId, rts]
  //   )
  // )

  useEffect(() => {
    if (hasAddons && !addOnId)
      navigate(getClusterAddOnDetailsPath({ clusterId, addOnId: addOns[0].id }))
  }, [addOns, addOnId, navigate, clusterId, hasAddons])

  useSetPageHeaderContent(
    useMemo(
      () =>
        addOnId ? (
          <div
            css={{
              display: 'flex',
              justifyContent: 'end',
              gap: theme.spacing.small,
            }}
          >
            <TabList
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
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
          </div>
        ) : undefined,
      [addOnId, currentTab?.path, pathPrefix, theme.spacing.small]
    )
  )

  if (error) return <GqlError error={error} />

  if (!data) return <LoadingIndicator />

  if (!hasAddons)
    return <EmptyState message="This cluster doesn’t have any add-ons." />

  return (
    <div css={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          marginRight: theme.spacing.medium,
          overflowY: 'auto',
          width: 320,
        }}
      >
        {addOns.map((addon, i) => (
          <ClusterAddOnsEntry
            addon={addon}
            active={addon.id === addOn?.id}
            first={i === 0}
          />
        ))}
      </div>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          gap: theme.spacing.medium,
        }}
      >
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridAutoRows: 'min-content',
            gridGap: theme.spacing.small,
          }}
        >
          <PropCard title="Add-on">{addOn?.name}</PropCard>
          <PropCard title="Add-on version">
            <div
              css={{
                alignItems: 'center',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              {toNiceVersion(addOn?.addonVersion?.version)}
              {addOn?.addonVersion?.blocking === true && (
                <Chip severity="danger">Blocking</Chip>
              )}
            </div>
          </PropCard>
          <PropCard title="Kubernetes version">
            {toNiceVersion(kubeVersion)}
          </PropCard>
        </div>
        {addOn ? <Outlet context={context} /> : <LoadingIndicator />}
      </div>
    </div>
  )
}

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
