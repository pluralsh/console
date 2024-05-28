import {
  EmptyState,
  Input,
  LoopingLogo,
  PlusIcon,
  SearchIcon,
  SubTab,
  TabList,
  TreeNavEntry,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { isEmpty } from 'lodash'
import { Outlet, useMatch, useNavigate, useParams } from 'react-router-dom'
import { useDebounce } from '@react-hooks-library/core'

import {
  STACK_CONFIGURATION_REL_PATH,
  STACK_ENV_REL_PATH,
  STACK_FILES_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_OVERVIEW_REL_PATH,
  STACK_REPOSITORY_REL_PATH,
  STACK_RUNS_REL_PATH,
  getStacksAbsPath,
} from '../../routes/stacksRoutesConsts'
import { GqlError } from '../utils/Alert'
import { mapExistingNodes } from '../../utils/graphql'
import {
  StackFragment,
  useKickStackMutation,
  useStacksQuery,
} from '../../generated/graphql'

import { useFetchPaginatedData } from '../cd/utils/useFetchPaginatedData'
import { StackedText } from '../utils/table/StackedText'

import KickButton from '../utils/KickButton'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { StandardScroller } from '../utils/SmoothScroller'
import { RESPONSIVE_LAYOUT_CONTENT_WIDTH } from '../utils/layout/ResponsiveLayoutContentContainer'
import { LinkTabWrap } from '../utils/Tabs'

import { StackTypeIcon } from './common/StackTypeIcon'
import CreateStack from './create/CreateStack'
import DeleteStack from './delete/DeleteStack'

export type StackOutletContextT = {
  stack: StackFragment
  refetch?: Nullable<() => void>
}

export const getBreadcrumbs = (stackId: string) => [
  { label: 'stacks', url: getStacksAbsPath('') },
  ...(stackId ? [{ label: stackId, url: getStacksAbsPath(stackId) }] : []),
]

const QUERY_PAGE_SIZE = 100

const DIRECTORY = [
  { path: STACK_OVERVIEW_REL_PATH, label: 'Overview' },
  { path: STACK_RUNS_REL_PATH, label: 'Runs' },
  { path: STACK_CONFIGURATION_REL_PATH, label: 'Configuration' },
  { path: STACK_REPOSITORY_REL_PATH, label: 'Repository' },
  { path: STACK_ENV_REL_PATH, label: 'Environment' },
  { path: STACK_FILES_REL_PATH, label: 'Files' },
  { path: STACK_JOB_REL_PATH, label: 'Job' },
]

export default function Stacks() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { stackId = '' } = useParams()
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getStacksAbsPath(stackId)}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const currentTab = DIRECTORY.find(({ path }) => path === tab)
  const [listRef, setListRef] = useState<any>(null)
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)

  useSetBreadcrumbs(useMemo(() => [...getBreadcrumbs(stackId)], [stackId]))

  const { data, loading, error, refetch, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      {
        queryHook: useStacksQuery,
        pageSize: QUERY_PAGE_SIZE,
        queryKey: 'infrastructureStacks',
      },
      {
        q: debouncedSearchString,
      }
    )

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

  const stack = useMemo(
    () => stacks.find(({ id }) => id === stackId),
    [stackId, stacks]
  )

  useEffect(() => {
    if (!isEmpty(stacks) && !stackId) navigate(getStacksAbsPath(stacks[0].id))
  }, [stacks, stackId, navigate])

  if (error)
    return (
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load stacks"
          error={error}
        />
      </div>
    )

  if (!data) {
    return <LoopingLogo />
  }

  if (isEmpty(stacks) && isEmpty(debouncedSearchString)) {
    return (
      <EmptyState message="Looks like you don't have any infrastructure stacks yet.">
        <CreateStack refetch={refetch} />
      </EmptyState>
    )
  }

  // if (!stack) {
  //   return <LoopingLogo />
  // }

  // TODO: Use separate query for stack.
  // TODO: Fix scrolling.

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <ResponsiveLayoutSidenavContainer width={360}>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.medium,
          }}
        >
          <Input
            flexGrow={1}
            placeholder="Search stacks"
            startIcon={<SearchIcon />}
            value={searchString}
            onChange={(e) => {
              setSearchString?.(e.currentTarget.value)
            }}
          />
          <CreateStack
            buttonContent={<PlusIcon />}
            buttonProps={{ secondary: true, height: 40 }}
            refetch={refetch}
          />
        </div>
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={stacks}
          loading={loading}
          placeholder={() => (
            <div css={{ height: 52, borderBottom: theme.borders.default }} />
          )}
          hasNextPage={pageInfo?.hasNextPage}
          mapper={(stack) => (
            <TreeNavEntry
              key={stack.id ?? ''}
              label={
                <div
                  css={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: theme.spacing.small,
                  }}
                >
                  <StackTypeIcon stackType={stack.type} />
                  <StackedText
                    first={stack.name}
                    second={stack.repository?.url}
                  />
                </div>
              }
              active={stack.id === stackId}
              activeSecondary={false}
              href={getStacksAbsPath(stack.id)}
              desktop
            />
          )}
          loadNextPage={() => pageInfo?.hasNextPage && fetchNextPage()}
          refreshKey={undefined}
          setLoader={undefined}
          handleScroll={undefined}
        />
        {isEmpty(stacks) && !isEmpty(debouncedSearchString) && (
          <EmptyState message="No stacks match your query." />
        )}
      </ResponsiveLayoutSidenavContainer>
      {stack && (
        <div css={{ height: '100%' }}>
          <div
            css={{
              alignItems: 'start',
              display: 'flex',
              gap: theme.spacing.medium,
              borderBottom: theme.borders.default,
              marginBottom: theme.spacing.medium,
              paddingBottom: theme.spacing.medium,
            }}
          >
            <div css={{ flexGrow: 1 }}>
              <div css={{ ...theme.partials.text.subtitle1 }}>{stack.name}</div>
              <div
                css={{
                  ...theme.partials.text.body1,
                  color: theme.colors['text-xlight'],
                }}
              >
                {stack.repository?.url}
              </div>
            </div>
            <DeleteStack
              stack={stack}
              refetch={refetch}
            />
            <KickButton
              pulledAt={stack.repository?.pulledAt}
              kickMutationHook={useKickStackMutation}
              message="Resync"
              tooltipMessage="Use this to sync this stack now instead of at the next poll interval"
              variables={{ id: stack.id }}
              width="max-content"
            />
          </div>
          <div css={{ width: RESPONSIVE_LAYOUT_CONTENT_WIDTH, height: '100%' }}>
            <TabList
              scrollable
              gap="xxsmall"
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
              marginRight="medium"
              paddingBottom="medium"
            >
              {DIRECTORY.map(({ label, path }) => (
                <LinkTabWrap
                  subTab
                  key={path}
                  textValue={label}
                  to={`${getStacksAbsPath(stackId)}/${path}`}
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
            <Outlet context={{ stack, refetch } as StackOutletContextT} />
          </div>
        </div>
      )}
    </ResponsiveLayoutPage>
  )
}
