import { Chip, SubTab, TabList } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  RuntimeServiceDetailsFragment,
  useRuntimeServiceQuery,
} from 'generated/graphql'
import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
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

import { useSetPageHeaderContent } from '../ContinuousDeployment'
import { useAddonsContext } from './ClusterAddOns.tsx'

export type ClusterAddOnOutletContextT = {
  addOn: Nullable<RuntimeServiceDetailsFragment>
  kubeVersion: Nullable<string>
}

export const versionPlaceholder = '_VSN_PLACEHOLDER_'

const directory = [
  { path: 'compatibility', label: 'Compatibility' },
  { path: 'releases', label: 'Releases' },
  { path: 'readme', label: 'README' },
]

export default function ClusterAddon() {
  const theme = useTheme()
  const { cluster } = useAddonsContext()
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
      }) as ClusterAddOnOutletContextT,
    [addOn, kubeVersion]
  )

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

  if (addOnError) return <GqlError error={addOnError} />

  if (!addOn) return <LoadingIndicator />

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
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
          overflow: 'hidden',
          width: '100%',
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
        <Outlet context={context} />
      </div>
    </div>
  )
}
