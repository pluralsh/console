import { Chip, Flex, SubTab, TabList } from '@pluralsh/design-system'
import {
  RuntimeServiceDetailsFragment,
  useRuntimeServiceQuery,
} from 'generated/graphql'
import { useMemo, useRef } from 'react'
import { Outlet, useMatch, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  CLUSTER_ADDONS_COMPATIBILITY_PATH,
  CLUSTER_ADDONS_PARAM_ID,
  CLUSTER_ADDONS_RELEASES_PATH,
  CLUSTER_PARAM_ID,
  getClusterAddOnDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { toNiceVersion } from '../../../utils/semver'
import { GqlError } from '../../utils/Alert'
import PropCard from '../../utils/PropCard.tsx'
import { LinkTabWrap } from '../../utils/Tabs'
import { getClusterKubeVersion } from '../clusters/runtime/RuntimeServices'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { useSetPageHeaderContent } from '../ContinuousDeployment'
import { useAddonsContext } from './ClusterAddOns.tsx'

export type ClusterAddOnOutletContextT = {
  addOn: Nullable<RuntimeServiceDetailsFragment>
  kubeVersion: Nullable<string>
}

export const versionPlaceholder = '_VSN_PLACEHOLDER_'

const directory = [
  { path: CLUSTER_ADDONS_COMPATIBILITY_PATH, label: 'Compatibility' },
  { path: CLUSTER_ADDONS_RELEASES_PATH, label: 'Releases' },
]

export default function ClusterAddon() {
  const { spacing } = useTheme()
  const { cluster, loading } = useAddonsContext()
  const kubeVersion = getClusterKubeVersion(cluster) ?? ''
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

  const {
    data: addOnData,
    loading: addOnLoading,
    error: addOnError,
  } = useRuntimeServiceQuery({
    skip: !addOnId || !cluster,
    variables: {
      id: addOnId,
      version: versionPlaceholder,
      kubeVersion,
      hasKubeVersion: !!kubeVersion,
    },
  })

  const addOn = addOnData?.runtimeService
  const isLoading = !addOn && (addOnLoading || loading)

  const context: ClusterAddOnOutletContextT = useMemo(
    () => ({ addOn, kubeVersion }),
    [addOn, kubeVersion]
  )

  useSetPageHeaderContent(
    useMemo(
      () =>
        addOnId ? (
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
        ) : undefined,
      [addOnId, currentTab?.path, pathPrefix]
    )
  )

  if (!addOn && !isLoading) return null

  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      height="100%"
      width="100%"
    >
      {addOnError && <GqlError error={addOnError} />}
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 'min-content',
          gridGap: spacing.small,
        }}
      >
        <PropCard
          title="Add-on"
          loading={isLoading}
        >
          {addOn?.name}
        </PropCard>
        <PropCard
          title="Add-on version"
          loading={isLoading}
        >
          <StretchedFlex>
            {toNiceVersion(addOn?.addonVersion?.version)}
            <Chip
              severity={addOn?.addonVersion?.blocking ? 'danger' : 'success'}
            >
              {addOn?.addonVersion?.blocking ? 'Blocking' : 'Not blocking'}
            </Chip>
          </StretchedFlex>
        </PropCard>
        <PropCard
          title="Kubernetes version"
          loading={isLoading}
        >
          {toNiceVersion(kubeVersion)}
        </PropCard>
      </div>
      {isLoading ? (
        <RectangleSkeleton
          $width="100%"
          $height="100%"
        />
      ) : (
        <Outlet context={context} />
      )}
    </Flex>
  )
}
