import {
  ClusterIcon,
  ComboBox,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  ManagementClusterIcon,
  SearchIcon,
  VirtualClusterIcon,
} from '@pluralsh/design-system'

import { useThrottle } from 'components/hooks/useThrottle'

import { FillLevelDiv } from 'components/utils/FillLevelDiv'
import { ClusterProviderIcon } from 'components/utils/Provider'
import { ClusterTinyFragment, useClusterSelectorQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { useProjectId } from '../../contexts/ProjectsContext'
import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'
import { ClusterUpgradeChip } from '../clusters/ClusterUpgradeButton'

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

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: useClusterSelectorQuery,
      keyPath: ['clusters'],
      errorPolicy: 'ignore',
    },
    { q: throttledInput || null, currentClusterId: clusterId, projectId }
  )

  const clusters = useMemo(
    () => data?.clusters?.edges?.flatMap((e) => (e?.node ? e.node : [])) || [],
    [data?.clusters?.edges]
  )

  const findCluster = useCallback(
    (clusterId: Nullable<string>) => {
      if (!clusterId) {
        return null
      }
      if (data?.cluster && data?.cluster.id === clusterId) {
        return data.cluster
      }

      return clusters?.find((cluster) => cluster?.id === clusterId)
    },
    [clusters, data?.cluster]
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
              {data?.cluster?.self ? (
                <ManagementClusterIcon />
              ) : data?.cluster?.virtual ? (
                <VirtualClusterIcon fullColor={false} />
              ) : (
                <ClusterIcon />
              )}
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
          ) : pageInfo?.hasNextPage ? (
            <ListBoxFooterPlus>Show more</ListBoxFooterPlus>
          ) : undefined
        }
        onFooterClick={() => {
          if (pageInfo?.hasNextPage) {
            fetchNextPage()
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
