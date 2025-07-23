import {
  ChatThreadTinyFragment,
  useClusterSelectorQuery,
  useUpdateChatThreadMutation,
} from '../../../../generated/graphql.ts'
import {
  ClusterIcon,
  Input,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  Select,
  Spinner,
  Toast,
} from '@pluralsh/design-system'

import { ChatInputSelectButton } from './ChatInputSelectButton.tsx'
import { useTheme } from 'styled-components'
import { useProjectId } from '../../../contexts/ProjectsContext.tsx'
import { useCallback, useMemo, useState } from 'react'
import { useThrottle } from '../../../hooks/useThrottle.tsx'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData.tsx'
import { ClusterProviderIcon } from '../../../utils/Provider.tsx'
import isEmpty from 'lodash/isEmpty'

export function ChatInputClusterSelect({
  currentThread,
}: {
  currentThread: ChatThreadTinyFragment
}) {
  const [
    updateThread,
    { loading: updateThreadLoading, error: updateThreadError },
  ] = useUpdateChatThreadMutation()

  const theme = useTheme()
  const projectId = useProjectId()
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 100)
  const currentClusterId = currentThread?.session?.cluster?.id

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData(
    {
      queryHook: useClusterSelectorQuery,
      keyPath: ['clusters'],
      errorPolicy: 'ignore',
    },
    {
      q: throttledInput || null,
      currentClusterId,
      projectId,
    }
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
    () => findCluster(currentClusterId),
    [currentClusterId, findCluster]
  )

  const onClusterChange = useCallback(
    (clusterId: string | null) => {
      if (clusterId !== currentClusterId) {
        updateThread({
          variables: {
            id: currentThread.id,
            attributes: {
              summary: currentThread.summary,
              session: { clusterId },
            },
          },
        })
      }
    },
    [currentThread.id, currentThread.summary, currentClusterId, updateThread]
  )

  if (loading && !data) return <Spinner size={12} />

  return (
    <>
      <Select
        selectedKey={currentClusterId ?? ''}
        onSelectionChange={(key) => onClusterChange(key as string | null)}
        label="cluster"
        width={270}
        dropdownHeaderFixed={
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
              color: theme.colors['text-xlight'],
              padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
            }}
          >
            Cluster
            <Input
              small
              inputProps={{ lineHeight: '12px' }}
              type="text"
              showClearButton
              placeholder="Search..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.currentTarget.value)
              }}
            />
          </div>
        }
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
          }
        }}
        dropdownFooterFixed={
          <ListBoxFooterPlus
            onClick={() => {
              setInputValue('')
              onClusterChange?.(null)
            }}
            leftContent={<ClusterIcon />}
          >
            Deselect cluster
          </ListBoxFooterPlus>
        }
        triggerButton={
          <ChatInputSelectButton>
            {updateThreadLoading ? (
              <Spinner size={12} />
            ) : selectedCluster ? (
              <ClusterProviderIcon
                cluster={selectedCluster}
                size={12}
              />
            ) : (
              <ClusterIcon size={12} />
            )}
            {selectedCluster?.name || 'cluster'}
          </ChatInputSelectButton>
        }
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
          />
        ))}
      </Select>
      <Toast
        show={!!updateThreadError}
        severity="danger"
        position="bottom"
        marginBottom="medium"
      >
        Error updating thread settings.
      </Toast>
    </>
  )
}
