import {
  ArrowTopRightIcon,
  Breadcrumb,
  Button,
  Flex,
  FlowIcon,
  Input2,
  SearchIcon,
  useSetBreadcrumbs,
  Card,
  EmptyState,
} from '@pluralsh/design-system'
import { EmptyStateCompact } from 'components/ai/AIThreads'
import { FlowCard } from 'components/flows/FlowCard'
import { FlowsDisplayPanel } from 'components/flows/FlowsDisplayPanel'
import { FlowsTable } from 'components/flows/FlowsTable'
import {
  DEFAULT_FLOWS_DISPLAY,
  FlowsDisplayState,
  getFlowFilterEmptyKind,
  hasUncheckedFlowFilters,
  parseFavoriteIds,
  parseFlowsView,
  resetFlowFilters,
  toFlowFilterVariables,
} from 'components/flows/flowsDisplay'
import usePersistedState from 'components/hooks/usePersistedState'
import { useThrottle } from 'components/hooks/useThrottle'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayButton,
  DisplayContentSC,
  DisplayFilterEmpty,
  DisplayMainSC,
  DisplayToolbarSC,
  toggleListValue,
} from 'components/utils/display/DisplayPanel'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, InlineA, Subtitle1H1 } from 'components/utils/typography/Text'
import { ServiceDeploymentStatus, useFlowsQuery } from 'generated/graphql'
import { compact, isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

const breadcrumbs: Breadcrumb[] = [{ label: 'flows', url: FLOWS_ABS_PATH }]
export const FLOW_DOCS_URL = 'https://docs.plural.sh/plural-features/flows'
const FLOWS_VIEW_STORAGE_KEY = 'flows-view'
const FLOWS_FAVORITES_STORAGE_KEY = 'flows-favorites'

export function Flows() {
  useSetBreadcrumbs(breadcrumbs)
  const theme = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchString = searchParams.get('q') ?? ''
  const debouncedSearchString = useThrottle(searchString, 200)
  const [persistedView, setPersistedView] = usePersistedState(
    FLOWS_VIEW_STORAGE_KEY,
    DEFAULT_FLOWS_DISPLAY.view,
    0,
    parseFlowsView
  )
  const [favoriteIds, setFavoriteIds] = usePersistedState(
    FLOWS_FAVORITES_STORAGE_KEY,
    [] as string[],
    0,
    parseFavoriteIds
  )
  const [displayOpen, setDisplayOpen] = useState(false)
  const [display, setDisplay] = useState(() => ({
    ...DEFAULT_FLOWS_DISPLAY,
    view: persistedView,
  }))
  const filterVars = useMemo(
    () => toFlowFilterVariables(display, favoriteIds),
    [display, favoriteIds]
  )
  const updateDisplay = (next: FlowsDisplayState) => {
    setDisplay(next)
    setPersistedView(next.view)
  }
  const toggleFavorite = (id: string) => {
    setFavoriteIds((ids) => toggleListValue(ids, id))
  }

  const {
    data,
    error,
    loading,
    pageInfo,
    refetch,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useFlowsQuery, keyPath: ['flows'] },
    { q: debouncedSearchString, ...filterVars }
  )

  const flows = useMemo(() => mapExistingNodes(data?.flows), [data])
  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        compact(data?.flowServiceCounts).map((entry) => [
          entry.status,
          entry.count,
        ])
      ) as Partial<Record<ServiceDeploymentStatus, number>>,
    [data]
  )
  const hasActiveSearch = !!debouncedSearchString
  const isSearchPending =
    searchString !== debouncedSearchString || (loading && isEmpty(flows))
  const filterEmptyKind = getFlowFilterEmptyKind(display)

  const listContent = () => {
    if (error) return <GqlError error={error} />
    if (filterEmptyKind) {
      return (
        <DisplayFilterEmpty
          title="No service health selected"
          description="It looks like there are no service health filters selected."
          onReset={() => updateDisplay(resetFlowFilters(display))}
        />
      )
    }
    if ((!data && loading) || isSearchPending) return <LoadingIndicator />
    if (isEmpty(flows)) {
      return hasActiveSearch ? (
        <Card css={{ padding: theme.spacing.large }}>
          <EmptyState message="No flows found" />
        </Card>
      ) : (
        <FlowEmptyState />
      )
    }
    if (display.view === 'list') {
      return (
        <FlowsTable
          flows={flows}
          loading={loading}
          hasNextPage={!!pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          setVirtualSlice={setVirtualSlice}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          refetch={refetch}
        />
      )
    }
    return (
      <CardGrid
        styles={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
          gridAutoRows: 'min-content',
        }}
        onBottomReached={() =>
          !loading && pageInfo?.hasNextPage && fetchNextPage()
        }
      >
        {flows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            refetch={refetch}
            favorited={favoriteIds.includes(flow.id)}
            onToggleFavorite={() => toggleFavorite(flow.id)}
          />
        ))}
      </CardGrid>
    )
  }

  return (
    <WrapperSC>
      <HeaderSC>
        <Flex direction="column">
          <Subtitle1H1>Flows</Subtitle1H1>
          <Body2P $color="text-light">
            Organize services, pipelines, MCP servers, and more into holistic
            units. <InlineA href={FLOW_DOCS_URL}>Learn more</InlineA>
          </Body2P>
        </Flex>
        <Button
          secondary
          as={Link}
          to={AI_MCP_SERVERS_ABS_PATH}
          endIcon={<ArrowTopRightIcon />}
        >
          Manage MCP servers
        </Button>
      </HeaderSC>
      <DisplayToolbarSC>
        <Input2
          showClearButton
          css={{ flex: 1 }}
          placeholder="Search flows"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) =>
            setSearchParams(
              { ...(e.currentTarget.value && { q: e.currentTarget.value }) },
              { replace: true }
            )
          }
        />
        <DisplayButton
          showDot={hasUncheckedFlowFilters(display)}
          onClick={() => setDisplayOpen(!displayOpen)}
        />
      </DisplayToolbarSC>
      <DisplayContentSC>
        <DisplayMainSC>{listContent()}</DisplayMainSC>
        {displayOpen && (
          <FlowsDisplayPanel
            state={display}
            onChange={updateDisplay}
            statusCounts={statusCounts}
          />
        )}
      </DisplayContentSC>
    </WrapperSC>
  )
}

function FlowEmptyState() {
  return (
    <EmptyStateCompact
      message="You do not have any Flows yet"
      description="You can generate your first one via CRD"
      cssProps={{ height: 'fit-content' }}
      icon={
        <FlowIcon
          color="icon-primary"
          size={32}
        />
      }
    >
      <Button
        as="a"
        href={FLOW_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<ArrowTopRightIcon />}
      >
        Read the docs
      </Button>
    </EmptyStateCompact>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
  overflow: 'hidden',
  padding: theme.spacing.large,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing.medium,
}))
