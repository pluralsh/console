import {
  ArrowTopRightIcon,
  Breadcrumb,
  Button,
  Flex,
  FlowIcon,
  useSetBreadcrumbs,
  Card,
  EmptyState,
} from '@pluralsh/design-system'
import { PageColumnSC, PageWithSidecar } from 'components/layout/PageLayout'
import { PageToolbar, ToolbarSearchInput } from 'components/layout/PageToolbar'
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
  DisplayFilterEmpty,
  toCounts,
  toggleListValue,
} from 'components/utils/display/DisplayPanel'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, InlineA, Subtitle1H1 } from 'components/utils/typography/Text'
import { FlowsDocument } from 'generated/graphql-documents'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

const breadcrumbs: Breadcrumb[] = [{ label: 'flows', url: FLOWS_ABS_PATH }]
const FLOWS_TABS = [{ path: FLOWS_ABS_PATH, label: 'Flows' }]
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
    { query: FlowsDocument, keyPath: ['flows'] },
    { q: debouncedSearchString, ...filterVars }
  )

  const flows = useMemo(() => mapExistingNodes(data?.flows), [data])
  const statusCounts = useMemo(
    () => toCounts(data?.flowServiceCounts, (entry) => entry.status),
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
      if (hasUncheckedFlowFilters(display)) {
        return (
          <DisplayFilterEmpty
            title="No flows found"
            description="It looks like there are no flows matching the selected filters."
            onReset={() => updateDisplay(resetFlowFilters(display))}
          />
        )
      }
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
    <PageColumnSC>
      <PageToolbar tabs={FLOWS_TABS}>
        <ToolbarSearchInput
          placeholder="Search flows"
          value={searchString}
          onChange={(q) => setSearchParams(q ? { q } : {}, { replace: true })}
        />
        <DisplayButton
          showDot={hasUncheckedFlowFilters(display)}
          expanded={displayOpen}
          onClick={() => setDisplayOpen(!displayOpen)}
        />
      </PageToolbar>
      <PageWithSidecar
        sidecar={
          displayOpen && (
            <FlowsDisplayPanel
              state={display}
              onChange={updateDisplay}
              statusCounts={statusCounts}
            />
          )
        }
      >
        <ContentSC>
          <Flex direction="column">
            <Subtitle1H1>Flows</Subtitle1H1>
            <Body2P $color="text-light">
              Organize services, pipelines, workbenches, and more into holistic
              units. <InlineA href={FLOW_DOCS_URL}>Learn more</InlineA>
            </Body2P>
          </Flex>
          {listContent()}
        </ContentSC>
      </PageWithSidecar>
    </PageColumnSC>
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

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  flex: 1,
  minHeight: 0,
  width: '100%',
  maxWidth: theme.breakpoints.desktop,
  alignSelf: 'center',
  padding: theme.spacing.large,
}))
