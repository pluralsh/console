import {
  EmptyState,
  Input,
  LoopingLogo,
  PlusIcon,
  SearchIcon,
  SubTab,
  TabList,
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
  useStackQuery,
  useStacksQuery,
} from '../../generated/graphql'
import { useFetchPaginatedData } from '../cd/utils/useFetchPaginatedData'
import KickButton from '../utils/KickButton'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'
import { StandardScroller } from '../utils/SmoothScroller'
import { LinkTabWrap } from '../utils/Tabs'
import { LoadingIndicatorWrap } from '../utils/LoadingIndicator'

import CreateStack from './create/CreateStack'
import DeleteStack from './delete/DeleteStack'
import StackEntry from './StacksEntry'

export type StackOutletContextT = {
  stack: StackFragment
  refetch?: Nullable<() => void>
}

export const getBreadcrumbs = (stackId: string) => [
  { label: 'stacks', url: getStacksAbsPath('') },
  ...(stackId ? [{ label: stackId, url: getStacksAbsPath(stackId) }] : []),
]

const QUERY_PAGE_SIZE = 100

const pollInterval = 5 * 1000

const DIRECTORY = [
  { path: STACK_RUNS_REL_PATH, label: 'Runs' },
  { path: STACK_OVERVIEW_REL_PATH, label: 'Overview' },
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

  const { data: stackData } = useStackQuery({
    variables: { id: stackId },
    fetchPolicy: 'cache-and-network',
    pollInterval,
  })

  const stack = useMemo(() => stackData?.infrastructureStack, [stackData])

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

  return (
    <ResponsiveLayoutPage css={{ paddingBottom: theme.spacing.large }}>
      <div css={{ marginRight: theme.spacing.xlarge, width: 340 }}>
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.small,
            marginBottom: theme.spacing.large,
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
            buttonProps={{ secondary: true, height: 40, width: 40 }}
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
          mapper={(stack, { prev, next }) => (
            <StackEntry
              stack={stack}
              active={stack.id === stackId}
              first={isEmpty(prev)}
              last={isEmpty(next)}
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
      </div>
      {stack ? (
        <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
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
            minHeight={56}
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
      ) : (
        <LoadingIndicatorWrap>
          <LoopingLogo />
        </LoadingIndicatorWrap>
      )}
    </ResponsiveLayoutPage>
  )
}
