import { Chip, EmptyState, SubTab, TabList } from '@pluralsh/design-system'
import React, { useEffect, useMemo, useRef } from 'react'
import {
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
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

import ClusterAddOnEntry from './addon/ClusterAddOnEntry'
import { getClusterBreadcrumbs, useClusterContext } from './Cluster'

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
    variables: {
      kubeVersion,
      hasKubeVersion: !!kubeVersion,
      id: cluster?.id ?? '',
    },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const addOns = useMemo(
    () => data?.cluster?.runtimeServices?.filter(isNonNullable) || [],
    [data?.cluster?.runtimeServices]
  )

  const addOn = addOns?.find((a) => a?.id === addOnId)

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
    if (!isEmpty(addOns) && !addOnId)
      navigate(getClusterAddOnDetailsPath({ clusterId, addOnId: addOns[0].id }))
  }, [addOns, addOnId, navigate, clusterId])

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

  if (!data) return <LoadingIndicator />

  if (addOns.length <= 0)
    return <EmptyState message="This cluster doesn’t have any add-ons." />

  return (
    <div css={{ display: 'flex' }}>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          marginRight: theme.spacing.large,
          minWidth: 320,
          width: 320,
        }}
      >
        <div
          css={{
            border: theme.borders.default,
            marginBottom: theme.spacing.large,
            overflowY: 'auto',
          }}
        >
          {addOns.map((addon, i) => (
            <ClusterAddOnEntry
              addon={addon}
              active={addon.id === addOn?.id}
              last={addOns.length - 1 === i}
            />
          ))}
        </div>
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
            marginBottom: theme.spacing.medium,
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
        {error ? (
          <GqlError error={error} />
        ) : addOn ? (
          <Outlet
            context={
              {
                runtimeService: addOn,
                kubeVersion,
              } satisfies ClusterAddOnContextType
            }
          />
        ) : (
          <LoadingIndicator />
        )}
      </div>
    </div>
  )
}

type ClusterAddOnContextType = {
  runtimeService: RuntimeServiceFragment
  kubeVersion: Nullable<string>
}

export function useClusterAddOnContext() {
  return useOutletContext<ClusterAddOnContextType>()
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
