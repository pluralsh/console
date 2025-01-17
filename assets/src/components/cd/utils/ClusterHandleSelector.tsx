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
import { useClusterSelectorQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'

import { useFetchPaginatedData } from '../../utils/table/useFetchPaginatedData'

export function ClusterHandleSelector({
  clusterHandle,
  setClusterHandle,
}: {
  clusterHandle: string
  setClusterHandle: (clusterHandle: string) => void
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 250)
  const [clusterSelectIsOpen, setClusterSelectIsOpen] = useState(false)

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: useClusterSelectorQuery,
      keyPath: ['clusters'],
      errorPolicy: 'ignore',
    },
    { q: throttledInput || undefined }
  )

  const clusters = useMemo(
    () => data?.clusters?.edges?.flatMap((e) => (e?.node ? e.node : [])) || [],
    [data?.clusters?.edges]
  )

  const findCluster = useCallback(
    (clusterHandle: string) =>
      clusters?.find((cluster) => cluster?.handle === clusterHandle),
    [clusters]
  )

  const selectedCluster = useMemo(
    () => findCluster(clusterHandle),
    [clusterHandle, findCluster]
  )

  return (
    <FillLevelDiv fillLevel={1}>
      <ComboBox
        inputProps={{
          style: { background: theme.colors['fill-two'] },
          placeholder: selectedCluster
            ? selectedCluster.handle
            : 'Search clusters',
        }}
        titleContent={
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
            {data?.cluster?.self ? (
              <ManagementClusterIcon />
            ) : data?.cluster?.virtual ? (
              <VirtualClusterIcon fullColor={false} />
            ) : (
              <ClusterIcon />
            )}
          </div>
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
        selectedKey={clusterHandle ?? ''}
        onSelectionChange={(key) => {
          const newCluster = findCluster(key as string)
          if (newCluster?.handle) setClusterHandle(newCluster.handle)
          setInputValue('')
        }}
      >
        {clusters.map((cluster) => (
          <ListBoxItem
            key={cluster?.handle ?? ''}
            label={cluster?.handle}
            leftContent={
              <ClusterProviderIcon
                cluster={cluster}
                size={16}
              />
            }
          />
        ))}
      </ComboBox>
    </FillLevelDiv>
  )
}
