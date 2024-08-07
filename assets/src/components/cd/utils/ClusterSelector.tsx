import {
  ClusterIcon,
  ComboBox,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  SearchIcon,
} from '@pluralsh/design-system'
import { useCallback, useMemo, useState } from 'react'

import { useThrottle } from 'components/hooks/useThrottle'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { ClusterTinyFragment, useClusterSelectorQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useTheme } from 'styled-components'
import { extendConnection } from 'utils/graphql'

import { FillLevelDiv } from 'components/utils/FillLevelDiv'

import { useProjectId } from '../../contexts/ProjectsContext'
import { ClusterUpgradeChip } from '../clusters/ClusterUpgrade'

export default function ClusterSelector({
  onClusterChange,
  clusterId,
  allowDeselect,
  hideTitleContent = false,
  showUpgrades = false,
  placeholder = 'Filter by cluster',
}: {
  onClusterChange: (cluster: ClusterTinyFragment | null) => void
  clusterId: Nullable<string>
  allowDeselect: boolean
  hideTitleContent?: boolean
  showUpgrades?: boolean
  placeholder?: string
}) {
  const theme = useTheme()
  const projectId = useProjectId()
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 100)
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)
  const {
    data: currentData,
    fetchMore,
    previousData,
    loading,
  } = useClusterSelectorQuery({
    variables: {
      q: throttledInput || null,
      currentClusterId: clusterId,
      projectId,
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
  })
  const data = currentData || previousData
  const clusters = useMemo(
    () => data?.clusters?.edges?.flatMap((e) => (e?.node ? e.node : [])) || [],
    [data?.clusters?.edges]
  )
  const pageInfo = data?.clusters?.pageInfo

  const findCluster = useCallback(
    (clusterId: Nullable<string>) => {
      if (!clusterId) {
        return null
      }
      if (currentData?.cluster && currentData?.cluster.id === clusterId) {
        return currentData.cluster
      }
      if (previousData?.cluster && previousData?.cluster.id === clusterId) {
        return previousData.cluster
      }

      return clusters?.find((cluster) => cluster?.id === clusterId)
    },
    [clusters, currentData?.cluster, previousData?.cluster]
  )
  const selectedCluster = useMemo(
    () => findCluster(clusterId),
    [clusterId, findCluster]
  )

  return (
    <FillLevelDiv fillLevel={1}>
      <ComboBox
        inputProps={{
          placeholder: selectedCluster ? selectedCluster.name : placeholder,
        }}
        titleContent={
          !hideTitleContent ? (
            <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
              <ClusterIcon />
            </div>
          ) : undefined
        }
        startIcon={
          clusterSelectIsOpen || !selectedCluster ? (
            <SearchIcon />
          ) : (
            <ClusterProviderIcon
              cluster={selectedCluster}
              size={16}
            />
          )
        }
        endIcon={
          showUpgrades ? (
            <ClusterUpgradeChip cluster={selectedCluster} />
          ) : undefined
        }
        inputValue={inputValue}
        onInputChange={setInputValue}
        loading={clusterSelectIsOpen && data && loading}
        isOpen={clusterSelectIsOpen}
        onOpenChange={(isOpen) => {
          setClusterSelectIsOpen(isOpen)
        }}
        dropdownFooter={
          !data ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : isEmpty(clusters) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : data?.clusters?.pageInfo.hasNextPage ? (
            <ListBoxFooterPlus>Show more</ListBoxFooterPlus>
          ) : undefined
        }
        onFooterClick={() => {
          if (data?.clusters?.pageInfo.hasNextPage) {
            if (!pageInfo) {
              return
            }
            fetchMore({
              variables: { after: pageInfo.endCursor },
              updateQuery: (prev, { fetchMoreResult: { clusters } }) =>
                extendConnection(prev, clusters, 'clusters'),
            })
          } else {
            setClusterSelectIsOpen(false)
          }
        }}
        {...(clusterId && allowDeselect
          ? {
              dropdownFooterFixed: (
                <ListBoxFooterPlus
                  onClick={() => {
                    setInputValue('')
                    setClusterSelectIsOpen(false)
                    onClusterChange?.(null)
                  }}
                  leftContent={<ClusterIcon />}
                >
                  Show all clusters
                </ListBoxFooterPlus>
              ),
            }
          : {})}
        selectedKey={clusterId || ''}
        onSelectionChange={(key) => {
          const newCluster = findCluster(key as string) ?? null

          if (newCluster || allowDeselect) {
            onClusterChange?.(newCluster)
          }
          setInputValue('')
        }}
      >
        {clusters.map((cluster) => (
          <ListBoxItem
            key={cluster?.id}
            label={cluster?.name}
            textValue={cluster?.name}
            leftContent={
              <ClusterProviderIcon
                cluster={cluster}
                size={16}
              />
            }
            rightContent={
              showUpgrades && cluster.id !== selectedCluster?.id ? (
                <ClusterUpgradeChip cluster={cluster} />
              ) : undefined
            }
          />
        ))}
      </ComboBox>
    </FillLevelDiv>
  )
}
