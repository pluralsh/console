import {
  ArrowTopRightIcon,
  Button,
  CloseIcon,
  Divider,
  EmptyState,
  FiltersIcon,
  IconFrame,
  Input,
  ListBoxItem,
  LoopingLogo,
  MoreIcon,
  PeopleIcon,
  ReturnIcon,
  SearchIcon,
  SubTab,
  TabList,
  Toast,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'

import { TagsFilter } from 'components/cd/services/ClusterTagsFilter'

import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'

import usePersistedState from 'components/hooks/usePersistedState'
import { InsightsTabLabel } from 'components/utils/AiInsights'
import { isEmpty } from 'lodash'
import { Key, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { useTheme } from 'styled-components'

import { keySetToTagArray } from 'utils/clusterTags'

import {
  Conjunction,
  StackFragment,
  StackTinyFragment,
  StackType,
  TagType,
  useKickStackMutation,
  useStackQuery,
  useStacksQuery,
} from '../../generated/graphql'
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

import { useProjectId } from '../contexts/ProjectsContext'
import { GqlError } from '../utils/Alert'
import KickButton from '../utils/KickButton'
import { ResponsiveLayoutPage } from '../utils/layout/ResponsiveLayoutPage'

import { MoreMenu } from '../utils/MoreMenu'
import { StandardScroller } from '../utils/SmoothScroller'
import { useFetchPaginatedData } from '../utils/table/useFetchPaginatedData'
import { LinkTabWrap } from '../utils/Tabs'
import StackStatusChip from './common/StackStatusChip.tsx'
import StackCustomRun from './customrun/StackCustomRun'
import RestoreStackButton from './RestoreStackButton.tsx'
import { StackDeletedEmptyState } from './StackDeletedEmptyState'
import StackDeleteModal from './StackDeleteModal'
import StackDetachModal from './StackDetachModal'
import StackPermissionsModal from './StackPermissionsModal'
import StackEntry from './StacksEntry'

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
    enabled: stack?.type === StackType.Terraform,
  },
  {
    path: STACK_OUTPUT_REL_PATH,
    label: 'Output',
    enabled: stack?.type === StackType.Terraform,
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

export default function Stacks() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { ai } = useDeploymentSettings()
  const { stackId = '' } = useParams()
  const projectId = useProjectId()
  const tabStateRef = useRef<any>(null)
  const pathMatch = useMatch(`${getStacksAbsPath(stackId)}/:tab`)
  const tab = pathMatch?.params?.tab || ''
  const [listRef, setListRef] = useState<any>(null)
  const [menuKey, setMenuKey] = useState<MenuItemKey>(MenuItemKey.None)
  const [showRestoreToast, setShowRestoreToast] = useState(false)

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

  const { data, loading, error, refetch, pageInfo, fetchNextPage } =
    useFetchPaginatedData(
      {
        queryHook: useStacksQuery,
        keyPath: ['infrastructureStacks'],
      },
      {
        q: debouncedSearchString,
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

  const {
    data: stackData,
    loading: stackLoading,
    error: stackError,
  } = useStackQuery({
    variables: { id: stackId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    pollInterval: 3_000,
  })

  const fullStack = useMemo(() => stackData?.infrastructureStack, [stackData])
  const directory = useMemo(
    () => getDirectory(fullStack, !!ai?.enabled),
    [ai?.enabled, fullStack]
  )
  const currentTab = directory.find(({ path }) => path === tab)
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
      <div css={{ padding: theme.spacing.large }}>
        <GqlError
          header="Cannot load stacks"
          error={error}
        />
      </div>
    )

  if (!tinyStack && stackLoading) {
    return <LoopingLogo />
  }

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

  return (
    <ResponsiveLayoutPage
      css={{
        paddingBottom: theme.spacing.large,
        gap: theme.spacing.xlarge,
      }}
    >
      {showRestoreToast && (
        <Toast
          position={'bottom'}
          onClose={() => setShowRestoreToast(false)}
          closeTimeout={5000}
          margin="large"
          severity="success"
        >
          Stack &quot;{tinyStack?.name}&quot; restored.
        </Toast>
      )}
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          minWidth: 340,
          width: 340,
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.small,
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
          {!filterExpanded && (
            <Button
              floating
              onClick={() => setFilterExpanded(true)}
              height={40}
              width={40}
            >
              <FiltersIcon />
            </Button>
          )}
        </div>
        {filterExpanded && (
          <TagsFilter
            type={TagType.Stack}
            innerChips={false}
            selectedTagKeys={selectedTagKeys}
            setSelectedTagKeys={setSelectedTagKeys}
            searchOp={tagOp}
            setSearchOp={setTagOp}
            comboBoxProps={{
              endIcon: (
                <CloseIcon
                  css={{
                    color: theme.colors['text-light'],
                    '&:hover': {
                      cursor: 'pointer',
                      color: theme.colors.text,
                    },
                  }}
                  onClick={() => setFilterExpanded(false)}
                />
              ),
            }}
          />
        )}
        <div css={{ marginTop: theme.spacing.medium, flex: 1 }}>
          <StandardScroller
            listRef={listRef}
            setListRef={setListRef}
            items={stacks}
            loading={loading}
            placeholder={() => (
              <div css={{ height: 52, borderBottom: theme.borders.default }} />
            )}
            hasNextPage={pageInfo?.hasNextPage}
            mapper={(stack, { prev }) => (
              <StackEntry
                stack={stack}
                active={stack.id === stackId}
                first={isEmpty(prev)}
              />
            )}
            loadNextPage={() => pageInfo?.hasNextPage && fetchNextPage()}
            refreshKey={undefined}
            setLoader={undefined}
            handleScroll={undefined}
          />
          {isEmpty(stacks) &&
            !(isEmpty(debouncedSearchString) && isEmpty(searchTags)) && (
              <EmptyState message="No stacks match your query.">
                <Button
                  secondary
                  onClick={() => setSearchString('')}
                >
                  Reset search
                </Button>
              </EmptyState>
            )}
        </div>
      </div>
      {stackError && !fullStack ? (
        <StackDeletedEmptyState />
      ) : (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: theme.spacing.medium,
            overflow: 'hidden',
          }}
        >
          <div
            css={{
              alignItems: 'start',
              display: 'flex',
              gap: theme.spacing.medium,
            }}
          >
            <div css={{ flexGrow: 1 }}>
              <div
                css={{
                  display: 'flex',
                  gap: theme.spacing.small,
                  alignItems: 'center',

                  ...theme.partials.text.subtitle1,
                }}
              >
                {tinyStack?.name}
                {deleting && (
                  <StackStatusChip
                    status={tinyStack?.status}
                    deleting={deleting}
                    size="small"
                  />
                )}
              </div>
              <div
                css={{
                  ...theme.partials.text.body1,
                  color: theme.colors['text-xlight'],
                }}
              >
                {tinyStack?.repository?.url}
              </div>
            </div>
            {!deleting ? (
              <KickButton
                floating
                pulledAt={tinyStack?.repository?.pulledAt}
                kickMutationHook={useKickStackMutation}
                message="Resync"
                tooltipMessage="Use this to sync this stack now instead of at the next poll interval"
                variables={{ id: tinyStack?.id }}
                width="max-content"
              />
            ) : (
              <RestoreStackButton
                id={tinyStack?.id ?? ''}
                setShowToast={setShowRestoreToast}
              />
            )}
            <StackCustomRun stackId={tinyStack?.id ?? ''} />
            <MoreMenu
              disabled={!fullStack}
              onSelectionChange={(newKey) => setMenuKey(newKey)}
              width={240}
              triggerButton={
                <IconFrame
                  textValue="Menu"
                  clickable
                  size="large"
                  icon={
                    <MoreIcon
                      width={16}
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
                leftContent={<PeopleIcon />}
              />
              <ListBoxItem
                destructive
                key={MenuItemKey.Detach}
                label="Detach stack"
                textValue="Detach stack"
                leftContent={<ReturnIcon color={theme.colors['icon-danger']} />}
              />
              <ListBoxItem
                destructive
                key={MenuItemKey.Delete}
                label={deleteLabel}
                textValue={deleteLabel}
                leftContent={
                  <TrashCanIcon color={theme.colors['icon-danger']} />
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
                  refetch={refetch}
                  open={menuKey === MenuItemKey.Delete}
                  onClose={() => setMenuKey(MenuItemKey.None)}
                />
              </>
            )}
          </div>
          <Divider backgroundColor={theme.colors.border} />
          <div>
            <TabList
              scrollable
              stateRef={tabStateRef}
              stateProps={{
                orientation: 'horizontal',
                selectedKey: currentTab?.path,
              }}
            >
              {directory
                .filter(({ enabled }) => enabled)
                .map(({ label, path }) => (
                  <LinkTabWrap
                    subTab
                    key={path}
                    to={`${getStacksAbsPath(stackId)}/${path}`}
                  >
                    <SubTab key={path}>{label}</SubTab>
                  </LinkTabWrap>
                ))}
            </TabList>
          </div>
          {!fullStack ? (
            <LoopingLogo css={{ flex: 1 }} />
          ) : (
            <div
              css={{
                width: '100%',
                height: '100%',
                overflowX: 'auto',
              }}
            >
              <Outlet
                context={
                  {
                    stack: fullStack,
                    refetch,
                    loading,
                  } satisfies StackOutletContextT
                }
              />
            </div>
          )}
        </div>
      )}
    </ResponsiveLayoutPage>
  )
}
