import { OperationVariables } from '@apollo/client/core'
import {
  ClusterIcon,
  ComboBox,
  FlowIcon,
  ListBoxFooter,
  ListBoxFooterPlus,
  ListBoxItem,
  ManagementClusterIcon,
  PeopleIcon,
  PersonIcon,
  SearchIcon,
  VirtualClusterIcon,
} from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import {
  InputMaybe,
  useClusterSelectorQuery,
  useFlowsQuery,
  useGroupsQuery,
  useUsersQuery,
} from '../../../generated/graphql.ts'
import { useThrottle } from '../../hooks/useThrottle.tsx'
import { FillLevelDiv } from '../../utils/FillLevelDiv.tsx'
import { ClusterProviderIcon } from '../../utils/Provider.tsx'
import {
  GenericQueryHook,
  useFetchPaginatedData,
} from '../../utils/table/useFetchPaginatedData.tsx'

// This file contains various selectors for clusters, groups, users, and flows.
// It uses a generic SelectorBase component to handle the common logic for fetching and displaying items.
// Selectors are used by the pr configuration inputs (PrConfigurationInput).

function SelectorBase<
  TQueryType extends Partial<Record<string, any>>,
  TVariables extends OperationVariables & {
    q?: InputMaybe<string> | undefined
  },
>({
  input,
  setInput,
  queryHook,
  queryKey,
  queryInputProp,
  placeholder,
  titleContentFn,
  startIconFn,
  selectedItemLeftContentFn,
}: {
  input: string
  setInput: (value: string) => void
  queryHook: GenericQueryHook<TQueryType, TVariables>
  queryKey: string
  queryInputProp: string
  placeholder?: string
  titleContentFn?: (data?: TQueryType) => ReactNode
  startIconFn?: (isOpen: boolean, selected) => ReactNode
  selectedItemLeftContentFn?: (item) => ReactNode
}) {
  const theme = useTheme()
  const [inputValue, setInputValue] = useState('')
  const throttledInput = useThrottle(inputValue, 250)
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<any>()

  const { data, loading, pageInfo, fetchNextPage } = useFetchPaginatedData<
    TQueryType,
    TVariables
  >(
    {
      queryHook: queryHook,
      keyPath: [queryKey],
      errorPolicy: 'ignore',
    },
    { q: throttledInput || undefined } as TVariables
  )

  const items = useMemo(
    () =>
      data?.[queryKey]?.edges?.flatMap((e) => (e?.node ? e.node : [])) || [],
    [data, queryKey]
  )

  const find = useCallback(
    (search: string) =>
      items?.find((group) => group?.[queryInputProp] === search),
    [items, queryInputProp]
  )

  return (
    <FillLevelDiv fillLevel={1}>
      <ComboBox
        inputProps={{
          style: { background: theme.colors['fill-two'] },
          placeholder: input ? input : placeholder ? placeholder : 'Search',
        }}
        titleContent={titleContentFn?.(data)}
        startIcon={startIconFn?.(isOpen, selected)}
        inputValue={inputValue}
        onInputChange={setInputValue}
        loading={isOpen && data && loading}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        dropdownFooter={
          !data ? (
            <ListBoxFooter>Loading</ListBoxFooter>
          ) : isEmpty(items) ? (
            <ListBoxFooter>No results</ListBoxFooter>
          ) : pageInfo?.hasNextPage ? (
            <ListBoxFooterPlus>Show more</ListBoxFooterPlus>
          ) : undefined
        }
        onFooterClick={() => {
          if (pageInfo?.hasNextPage) {
            fetchNextPage()
          } else {
            setIsOpen(false)
          }
        }}
        selectedKey={input ?? ''}
        onSelectionChange={(key) => {
          const newItem = find(key as string)
          if (newItem?.[queryInputProp]) {
            setInput(newItem?.[queryInputProp])
            setSelected(newItem)
          }
          setInputValue('')
        }}
      >
        {items.map((item) => (
          <ListBoxItem
            key={item?.[queryInputProp]}
            label={item?.[queryInputProp]}
            leftContent={selectedItemLeftContentFn?.(item)}
          />
        ))}
      </ComboBox>
    </FillLevelDiv>
  )
}

function ClusterHandleSelector({
  clusterHandle,
  setClusterHandle,
}: {
  clusterHandle: string
  setClusterHandle: (clusterHandle: string) => void
}) {
  const theme = useTheme()

  return (
    <SelectorBase
      input={clusterHandle}
      setInput={setClusterHandle}
      queryHook={useClusterSelectorQuery}
      queryKey="clusters"
      queryInputProp="handle"
      placeholder="Search clusters"
      titleContentFn={(data) => (
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          {data?.cluster?.self ? (
            <ManagementClusterIcon />
          ) : data?.cluster?.virtual ? (
            <VirtualClusterIcon fullColor={false} />
          ) : (
            <ClusterIcon />
          )}
        </div>
      )}
      startIconFn={(isOpen, selected) =>
        isOpen || !selected ? (
          <SearchIcon />
        ) : (
          <ClusterProviderIcon
            cluster={selected}
            size={16}
          />
        )
      }
      selectedItemLeftContentFn={(data) => (
        <ClusterProviderIcon
          cluster={data}
          size={16}
        />
      )}
    />
  )
}

function GroupSelector({
  group,
  setGroup,
}: {
  group: string
  setGroup: (value: string) => void
}) {
  const theme = useTheme()

  return (
    <SelectorBase
      input={group}
      setInput={setGroup}
      queryHook={useGroupsQuery}
      queryKey="groups"
      queryInputProp="name"
      placeholder="Search groups"
      titleContentFn={() => (
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <PeopleIcon />
        </div>
      )}
      startIconFn={(isOpen, selected) =>
        isOpen || !selected ? <SearchIcon /> : undefined
      }
    />
  )
}

function UserSelector({
  user,
  setUser,
}: {
  user: string
  setUser: (value: string) => void
}) {
  const theme = useTheme()

  return (
    <SelectorBase
      input={user}
      setInput={setUser}
      queryHook={useUsersQuery}
      queryKey="users"
      queryInputProp="email"
      placeholder="Search users"
      titleContentFn={() => (
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <PersonIcon />
        </div>
      )}
      startIconFn={(isOpen, selected) =>
        isOpen || !selected ? <SearchIcon /> : undefined
      }
    />
  )
}

function FlowSelector({
  flow,
  setFlow,
}: {
  flow: string
  setFlow: (value: string) => void
}) {
  const theme = useTheme()

  return (
    <SelectorBase
      input={flow}
      setInput={setFlow}
      queryHook={useFlowsQuery}
      queryKey="flows"
      queryInputProp="name"
      placeholder="Search flows"
      titleContentFn={() => (
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <FlowIcon />
        </div>
      )}
      startIconFn={(isOpen, selected) =>
        isOpen || !selected ? <SearchIcon /> : undefined
      }
    />
  )
}

export { ClusterHandleSelector, GroupSelector, UserSelector, FlowSelector }
