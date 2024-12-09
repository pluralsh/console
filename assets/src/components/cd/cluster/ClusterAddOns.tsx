import { Chip, EmptyState, SubTab, TabList } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  RuntimeServiceDetailsFragment,
  useRuntimeServiceQuery,
  useRuntimeServicesQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import { Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import {
  CLUSTER_ADDONS_PARAM_ID,
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { toNiceVersion } from '../../../utils/semver'
import { GqlError } from '../../utils/Alert'
import PropCard from '../../utils/PropCard.tsx'
import { LinkTabWrap } from '../../utils/Tabs'
import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'

import { POLL_INTERVAL, useSetPageHeaderContent } from '../ContinuousDeployment'
import { useClusterContext } from './Cluster'

import ClusterAddOnsEntry from './ClusterAddOnsEntry'

export const versionPlaceholder = '_VSN_PLACEHOLDER_'

export type ClusterAddOnOutletContextT = {
  addOn: Nullable<RuntimeServiceDetailsFragment>
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

  const { data: addOnData, error: addOnError } = useRuntimeServiceQuery({
    skip: !addOnId,
    variables: {
      id: addOnId,
      version: versionPlaceholder,
      kubeVersion,
      hasKubeVersion: !!kubeVersion,
    },
  })

  const addOn = useMemo(
    () => addOnData?.runtimeService,
    [addOnData?.runtimeService]
  )

  const context = useMemo(
    () =>
      ({
        addOn,
        kubeVersion,
      }) satisfies ClusterAddOnOutletContextT,
    [addOn, kubeVersion]
  )

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

  if (addOnError) return <GqlError error={addOnError} />

  if (!data) return <LoadingIndicator />

  if (!hasAddons)
    return <EmptyState message="This cluster doesn’t have any add-ons." />

  return (
    <div
      css={{
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        css={{
          flexShrink: 0,
          marginRight: theme.spacing.medium,
          overflowY: 'auto',
          width: 320,
        }}
      >
        {addOns.map((addon, i) => (
          <ClusterAddOnsEntry
            key={addon.id}
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
          gap: theme.spacing.medium,
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {addOn ? (
          <>
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
            <Outlet context={context} />
          </>
        ) : (
          <LoadingIndicator />
        )}
      </div>
    </div>
  )
}
