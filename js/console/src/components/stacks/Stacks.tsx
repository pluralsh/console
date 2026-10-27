import {
  ICON_FRAME_ICON_SIZE,
  ArrowTopRightIcon,
  Button,
  EmptyState,
  FiltersIcon,
  Flex,
  IconFrame,
  Input,
  ListBoxItem,
  MoreIcon,
  PeopleIcon,
  ReturnIcon,
  SearchIcon,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'

import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import usePersistedState from 'components/hooks/usePersistedState'
import {
  PageSidebarBodySC,
  PageSidebarHeaderSC,
  PageSidebarSC,
  PageWithSidebar,
} from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import { InsightsTabLabel } from 'components/utils/AiInsights'

import { VirtualList } from 'components/utils/VirtualList.tsx'
import { isEmpty } from 'lodash'
import { Key, useEffect, useMemo, useState } from 'react'
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import { keySetToTagArray } from 'utils/clusterTags'

import {
  Conjunction,
  StackFragment,
  StackTinyFragment,
  StackType,
  TagType,
  useStackQuery,
} from '../../generated/graphql'
import { StacksDocument } from '../../generated/graphql-documents'
import {
  getStacksAbsPath,
  STACK_ENV_REL_PATH,
  STACK_FILES_REL_PATH,
  STACK_INSIGHTS_REL_PATH,
  STACK_JOB_REL_PATH,
  STACK_OUTPUT_REL_PATH,
  STACK_OVERVIEW_REL_PATH,
  STACK_PRS_REL_PATH,
  STACK_RUNS_REL_PATH,
  STACK_STATE_REL_PATH,
  STACK_VARS_REL_PATH,
} from '../../routes/stacksRoutesConsts'
import { mapExistingNodes } from '../../utils/graphql'
import { isTerraformFamilyStackType } from './common/stackTypeUtils'
import {
  STACK_DELTA_FALLBACK_POLL_INTERVAL,
  useStackDeltas,
  useStackRunDeltas,
} from './common/useStackDeltas'

import { RectangleSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { useProjectId } from '../contexts/ProjectsContext'
import { GqlError } from '../utils/Alert'
import { MoreMenu } from '../utils/MoreMenu'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData'
import StackActions from './StackActions'
import { StackDeletedEmptyState } from './StackDeletedEmptyState'
import StackDeleteModal from './StackDeleteModal'
import StackDetachModal from './StackDetachModal'
import StackPermissionsModal from './StackPermissionsModal'
import { StackEntry } from './StacksEntry'

export type StackOutletContextT = {
  stack: StackFragment
  refetch: () => void
  loading: boolean
}

export const getBreadcrumbs = (
  stackId: Nullable<string>,
  stackName: Nullable<string>
) => [
  { label: 'stacks', url: getStacksAbsPath('') },
  ...(stackId
    ? [{ label: stackName || stackId, url: getStacksAbsPath(stackId) }]
    : []),
]

enum MenuItemKey {
  None = '',
  ManagePermissions = 'managePermissions',
  Detach = 'detach',
  Delete = 'delete',
}

const getDirectory = (stack: Nullable<StackFragment>, aiEnabled: boolean) => [
  { path: STACK_RUNS_REL_PATH, label: 'Runs', enabled: true },
  { path: STACK_PRS_REL_PATH, label: 'PRs', enabled: true },
  {
    path: STACK_STATE_REL_PATH,
    label: 'State',
    enabled:
      isTerraformFamilyStackType(stack?.type) ||
      stack?.type === StackType.Pulumi,
  },
  {
    path: STACK_OUTPUT_REL_PATH,
    label: 'Output',
    enabled:
      isTerraformFamilyStackType(stack?.type) ||
      stack?.type === StackType.Pulumi,
  },
  { path: STACK_VARS_REL_PATH, label: 'Variables', enabled: true },
  {
    path: STACK_INSIGHTS_REL_PATH,
    label: <InsightsTabLabel insight={stack?.insight} />,
    enabled: aiEnabled,
  },
  { path: STACK_ENV_REL_PATH, label: 'Environment', enabled: true },
  { path: STACK_FILES_REL_PATH, label: 'Files', enabled: true },
  { path: STACK_JOB_REL_PATH, label: 'Job', enabled: true },
  { path: STACK_OVERVIEW_REL_PATH, label: 'Configuration', enabled: true },
]

export function Stacks() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { ai } = useDeploymentSettings()
  const { stackId = '' } = useParams()
  const projectId = useProjectId()
  const pathMatch = useMatch(`${getStacksAbsPath(stackId)}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.None)
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)
  const [filterExpanded, setFilterExpanded] = useState(false)
  const [selectedTagKeys, setSelectedTagKeys] = useState(new Set<Key>())
  const [tagOp, setTagOp] = usePersistedState(
    'tag-search-operator',
    Conjunction.Or
  )
  const searchTags = useMemo(
    () => keySetToTagArray(selectedTagKeys),
    [selectedTagKeys]
  )

  const {
    data,
    loading,
    error,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      query: StacksDocument,
      keyPath: ['infrastructureStacks'],
      pollInterval: STACK_DELTA_FALLBACK_POLL_INTERVAL,
    },
    {
      q: debouncedSearchString || undefined,
      projectId,
      ...(!isEmpty(searchTags)
        ? { tagQuery: { op: tagOp, tags: searchTags } }
        : {}),
    }
  )

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

  const tinyStack: Nullable<StackTinyFragment> = useMemo(
    () => stacks.find((stk) => stk.id === stackId),
    [stackId, stacks]
  )

  const { data: stackData, error: stackError } = useStackQuery({
    variables: { id: stackId },
    skip: !stackId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    pollInterval: STACK_DELTA_FALLBACK_POLL_INTERVAL,
  })

  useStackDeltas()
  useStackRunDeltas(stackId)

  const fullStack = useMemo(() => stackData?.infrastructureStack, [stackData])
  const directory = useMemo(
    () => getDirectory(fullStack, !!ai?.enabled),
    [ai?.enabled, fullStack]
  )
  const tabs = useMemo(
    () =>
      directory
        .filter(({ enabled }) => enabled)
        .map(({ label, path }) => ({
          label,
          path: `${getStacksAbsPath(stackId)}/${path}`,
        })),
    [directory, stackId]
  )
  const deleteLabel = fullStack?.deletedAt
    ? 'Retry stack delete'
    : 'Delete  stack'
  const deleting = !!fullStack?.deletedAt

  useEffect(() => {
    if (!isEmpty(stacks) && !stackId)
      navigate(getStacksAbsPath(stacks[0]?.id), { replace: true })
  }, [stacks, stackId, navigate])

  useSetBreadcrumbs(
    useMemo(
      () => [...getBreadcrumbs(fullStack?.id, fullStack?.name)],
      [fullStack]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        header="Cannot load stacks"
        error={error}
      />
    )

  if (
    isEmpty(stacks) &&
    isEmpty(debouncedSearchString) &&
    isEmpty(searchTags) &&
    !loading
  ) {
    return (
      <EmptyState message="Looks like you don't have any infrastructure stacks yet.">
        <Button
          as={Link}
          to="https://docs.plural.sh/plural-features/stacks-iac-management"
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<ArrowTopRightIcon />}
        >
          Create a stack
        </Button>
      </EmptyState>
    )
  }

  const sidebar = (
    <PageSidebarSC $width={340}>
      <PageSidebarHeaderSC>
        <Flex
          gap="xsmall"
          align="center"
        >
          <Input
            size="small"
            showClearButton
            placeholder="Search stacks"
            startIcon={<SearchIcon size={12} />}
            value={searchString}
            onChange={(e) => setSearchString(e.currentTarget.value)}
            css={{ flex: 1, minWidth: 0 }}
          />
          <IconFrame
            clickable
            size="medium"
            type={filterExpanded ? 'secondary' : 'tertiary'}
            icon={<FiltersIcon />}
            tooltip={filterExpanded ? 'Hide tag filter' : 'Filter by tags'}
            aria-label="Filter by tags"
            onClick={() => setFilterExpanded(!filterExpanded)}
          />
        </Flex>
      </PageSidebarHeaderSC>
      {filterExpanded && (
        <TagFilterSC>
          <TagsFilter
            small
            type={TagType.Stack}
            innerChips={false}
            selectedTagKeys={selectedTagKeys}
            setSelectedTagKeys={setSelectedTagKeys}
            searchOp={tagOp}
            setSearchOp={setTagOp}
          />
        </TagFilterSC>
      )}
      <StackListSC>
        {(!isEmpty(stacks) || (!data && loading)) && (
          <VirtualList
            data={stacks}
            loading={!data && loading}
            skeletonProps={{ gap: 'xxxsmall', height: 72 }}
            onVirtualSliceChange={setVirtualSlice}
            hasNextPage={pageInfo?.hasNextPage}
            isLoadingNextPage={loading}
            loadNextPage={() => pageInfo?.hasNextPage && fetchNextPage()}
            renderer={({ rowData }) => (
              <StackEntry
                stack={rowData}
                active={rowData.id === stackId}
              />
            )}
          />
        )}
        {isEmpty(stacks) &&
          !(isEmpty(debouncedSearchString) && isEmpty(searchTags)) && (
            <EmptyState message="No stacks match your query.">
              <Button
                secondary
                small
                onClick={() => setSearchString('')}
              >
                Reset search
              </Button>
            </EmptyState>
          )}
      </StackListSC>
    </PageSidebarSC>
  )

  if (stackError && !fullStack)
    return (
      <PageWithSidebar sidebar={sidebar}>
        <StackDeletedEmptyState />
      </PageWithSidebar>
    )

  return (
    <PageWithSidebar
      sidebar={sidebar}
      toolbar={
        <PageToolbar
          tabs={tabs}
          activeFn={(path) => path === `${getStacksAbsPath(stackId)}/${tab}`}
          slotRef={setToolbarSlot}
        >
          <StackActions
            deleting={deleting}
            stack={tinyStack}
          />
          <MoreMenu
            disabled={!fullStack}
            onSelectionChange={(newKey) => setMenuKey(newKey)}
            width={240}
            triggerButton={
              <IconFrame
                textValue="Menu"
                clickable
                size="medium"
                iconSize={ICON_FRAME_ICON_SIZE.small}
                icon={
                  <MoreIcon
                    color={
                      !fullStack ? theme.colors['icon-disabled'] : undefined
                    }
                  />
                }
                type="secondary"
              />
            }
          >
            <ListBoxItem
              key={MenuItemKey.ManagePermissions}
              label="Manage permissions"
              textValue="Manage permissions"
              leftContent={<PeopleIcon size={ICON_FRAME_ICON_SIZE.small} />}
            />
            <ListBoxItem
              destructive
              key={MenuItemKey.Detach}
              label="Detach stack"
              textValue="Detach stack"
              leftContent={
                <ReturnIcon
                  size={ICON_FRAME_ICON_SIZE.small}
                  color={theme.colors['icon-danger']}
                />
              }
            />
            <ListBoxItem
              destructive
              key={MenuItemKey.Delete}
              label={deleteLabel}
              textValue={deleteLabel}
              leftContent={
                <TrashCanIcon
                  size={ICON_FRAME_ICON_SIZE.small}
                  color={theme.colors['icon-danger']}
                />
              }
            />
          </MoreMenu>
          {fullStack && (
            <>
              <StackPermissionsModal
                stack={fullStack}
                open={menuKey === MenuItemKey.ManagePermissions}
                onClose={() => setMenuKey(MenuItemKey.None)}
              />
              <StackDetachModal
                stack={fullStack}
                refetch={refetch}
                open={menuKey === MenuItemKey.Detach}
                onClose={() => setMenuKey(MenuItemKey.None)}
              />
              <StackDeleteModal
                stack={fullStack}
                open={menuKey === MenuItemKey.Delete}
                onClose={() => setMenuKey(MenuItemKey.None)}
              />
            </>
          )}
        </PageToolbar>
      }
    >
      <ContentSC>
        {/* TODO: make stack nullable on the context type and add skeletons at the drill-down levels */}
        {!fullStack ? (
          <RectangleSkeleton
            $height="100%"
            $width="100%"
          />
        ) : (
          <PageToolbarSlotContext value={toolbarSlot}>
            <Outlet
              context={
                {
                  stack: fullStack,
                  refetch,
                  loading,
                } satisfies StackOutletContextT
              }
            />
          </PageToolbarSlotContext>
        )}
      </ContentSC>
    </PageWithSidebar>
  )
}

const TagFilterSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  padding: theme.spacing.small,
  borderBottom: theme.borders.hairline,
}))

const StackListSC = styled(PageSidebarBodySC)({
  padding: 0,
  overflow: 'hidden',
})

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  overflow: 'hidden',
  padding: theme.spacing.large,
}))
