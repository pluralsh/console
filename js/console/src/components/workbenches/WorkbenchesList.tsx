import { AddIcon, Card, CaretRightIcon, Flex } from '@pluralsh/design-system'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
import * as DesignSystem from '@pluralsh/design-system'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import { PageSidecarPortal } from 'components/layout/PageLayout'
import { ToolbarSearchInput } from 'components/layout/PageToolbar'
import { WorkbenchStatCard } from 'components/workbenches/common/WorkbenchStatCard'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { formatTokenCount } from 'components/workbenches/common/workbenchUsage'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import {
  DisplayButton,
  useDisplayState,
} from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import {
  WorkbenchTinyFragment,
  useWorkbenchesQuery,
  useWorkbenchesSummaryQuery,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import {
  WORKBENCHES_CREATE_REL_PATH,
  getWorkbenchAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { ComponentType, useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  WorkbenchCodingAgent,
  WorkbenchToolIcons,
} from './common/WorkbenchMetadata'
import { workbenchToolCardGridStyles } from './tools/workbenchToolsUtils'
import { WorkbenchActionsMenu } from './WorkbenchActionsMenu'
import { WorkbenchesDisplayPanel } from './WorkbenchesDisplayPanel'
import { WorkbenchesTable } from './WorkbenchesTable'
import {
  DEFAULT_WORKBENCHES_DISPLAY,
  WORKBENCHES_VIEW_STORAGE_KEY,
  toWorkbenchSortVariables,
  useWorkbenchFavorites,
} from './workbenchesDisplay'

const WORKBENCH_CARD_MIN_WIDTH = 340
const WORKBENCH_CARD_DESC_VISIBLE_LINES = 2
const WORKBENCH_LIST_CARD_MIN_HEIGHT_PX = 168

const WorkbenchIcon = (DesignSystem as { WorkbenchIcon?: ComponentType })
  .WorkbenchIcon

export function WorkbenchesList() {
  const projectId = useProjectId()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useThrottle(searchString, 200)
  const { display, updateDisplay } = useDisplayState(
    WORKBENCHES_VIEW_STORAGE_KEY,
    DEFAULT_WORKBENCHES_DISPLAY
  )
  const [displayOpen, setDisplayOpen] = useState(false)
  const { favoriteIds, toggleFavorite } = useWorkbenchFavorites()
  const sortVariables = useMemo(
    () => toWorkbenchSortVariables(display, favoriteIds),
    [display, favoriteIds]
  )

  const { data, error, loading, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: useWorkbenchesQuery, keyPath: ['workbenches'] },
      { q: debouncedSearchString, projectId, ...sortVariables }
    )

  const workbenches = useMemo(
    () => mapExistingNodes(data?.workbenches),
    [data?.workbenches]
  )
  const hasActiveSearch = !!debouncedSearchString
  const showSearchEmptyState = hasActiveSearch && workbenches.length === 0

  useSetPageHeaderContent(
    useMemo(
      () => (
        <Flex
          align="center"
          gap="medium"
        >
          <ToolbarSearchInput
            placeholder="Search workbenches"
            value={searchString}
            onChange={setSearchString}
          />
          <DisplayButton
            showDot={false}
            expanded={displayOpen}
            onClick={() => setDisplayOpen((open) => !open)}
          />
        </Flex>
      ),
      [searchString, displayOpen]
    )
  )

  const content = () => {
    if (!data && loading)
      return (
        <CardGridSkeleton
          count={6}
          styles={workbenchToolCardGridStyles(WORKBENCH_CARD_MIN_WIDTH)}
        />
      )
    if (showSearchEmptyState)
      return (
        <WorkbenchEmptyState
          inset={false}
          message="No workbenches match your search"
          description="Try a different name, or clear the search to see all workbenches."
        />
      )
    if (display.view === 'list')
      return (
        <WorkbenchesTable
          workbenches={workbenches}
          loading={loading}
          hasNextPage={!!pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          setVirtualSlice={setVirtualSlice}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
        />
      )

    return (
      <CardGrid
        onBottomReached={() =>
          !loading && pageInfo?.hasNextPage && fetchNextPage()
        }
        styles={workbenchToolCardGridStyles(WORKBENCH_CARD_MIN_WIDTH)}
      >
        <CreateCardSC
          clickable
          forwardedAs={Link}
          to={WORKBENCHES_CREATE_REL_PATH}
        >
          <Flex
            align="center"
            gap="xsmall"
          >
            <AddIcon />
            <Body2BoldP>Create Workbench</Body2BoldP>
          </Flex>
        </CreateCardSC>
        {workbenches.map((workbench) => (
          <WorkbenchCard
            key={workbench.id}
            workbench={workbench}
            favorited={favoriteIds.includes(workbench.id)}
            onToggleFavorite={() => toggleFavorite(workbench.id)}
          />
        ))}
      </CardGrid>
    )
  }

  return (
    <WrapperSC>
      <WorkbenchTabHeader
        title="Workbenches"
        icon={WorkbenchIcon ? <WorkbenchIcon /> : undefined}
        description="Build-your-own agents for common DevOps tasks. Each workbench bundles tools and skills, and orchestrates subagents tailored to observability, infra analysis, and coding tasks."
      />
      <WorkbenchesSummary projectId={projectId} />
      {error && <GqlError error={error} />}
      {content()}
      {displayOpen && (
        <PageSidecarPortal>
          <WorkbenchesDisplayPanel
            state={display}
            onChange={updateDisplay}
          />
        </PageSidecarPortal>
      )}
    </WrapperSC>
  )
}

function WorkbenchesSummary({ projectId }: { projectId?: string }) {
  const theme = useTheme()
  const { data, loading, error } = useWorkbenchesSummaryQuery({
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  })
  const aggregates = data?.workbenchAggregates
  const isLoading = !data && loading

  if (error) return <GqlError error={error} />

  return (
    <div
      css={{
        display: 'grid',
        gap: theme.spacing.large,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        flexShrink: 0,
      }}
    >
      <WorkbenchStatCard
        label="PRs merged"
        value={(aggregates?.pullRequests ?? 0).toLocaleString()}
        helper="Over lifetime"
        loading={isLoading}
      />
      <WorkbenchStatCard
        label="Hours saved"
        value={formatHours(aggregates?.hoursSaved ?? 0)}
        helper="Estimated from the size of merged PRs"
        loading={isLoading}
      />
      <WorkbenchStatCard
        label="Tokens consumed"
        value={formatTokenCount(aggregates?.totalTokens ?? 0) ?? '0'}
        helper="Over lifetime"
        loading={isLoading}
      />
    </div>
  )
}

function formatHours(hours: number) {
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours).toLocaleString()}h`
}

export function WorkbenchCard({
  workbench,
  favorited,
  onToggleFavorite,
}: {
  workbench: WorkbenchTinyFragment
  favorited: boolean
  onToggleFavorite: () => void
}) {
  const theme = useTheme()
  const { id, name, description, agentRuntime, tools } = workbench
  const hasCodingAgent = Boolean(agentRuntime?.name)
  const hasTools = !!tools?.some(isNonNullable)

  return (
    <WorkbenchCardSC>
      <CardLinkSC
        to={getWorkbenchAbsPath(id)}
        aria-label={name}
      />
      <CardContentSC>
        <Body2BoldP>{name}</Body2BoldP>
        <DescriptionReserveSC>
          {description && (
            <Body2P
              css={{
                color: theme.colors['text-light'],
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: WORKBENCH_CARD_DESC_VISIBLE_LINES,
                overflow: 'hidden',
              }}
            >
              {description}
            </Body2P>
          )}
        </DescriptionReserveSC>
        {(hasCodingAgent || hasTools) && (
          <MetadataGridSC>
            {hasCodingAgent && (
              <>
                <MetadataLabelSC>coding agent</MetadataLabelSC>
                <MetadataValueSC>
                  <WorkbenchCodingAgent agentRuntime={agentRuntime} />
                </MetadataValueSC>
              </>
            )}
            {hasTools && (
              <>
                <MetadataLabelSC>bound tools</MetadataLabelSC>
                <MetadataValueSC>
                  <WorkbenchToolIcons tools={tools} />
                </MetadataValueSC>
              </>
            )}
          </MetadataGridSC>
        )}
      </CardContentSC>
      <CardFooterSC>
        <Flex
          gap="xsmall"
          align="center"
        >
          <WorkbenchActionsMenu
            workbenchId={id}
            favorited={favorited}
            onToggleFavorite={onToggleFavorite}
          />
          <FlowFavoriteButton
            favorited={favorited}
            onToggle={onToggleFavorite}
          />
        </Flex>
        <CaretRightIcon
          color="icon-xlight"
          size={16}
        />
      </CardFooterSC>
    </WorkbenchCardSC>
  )
}

const CardLinkSC = styled(Link)({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
})

const CardContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  minWidth: 0,
}))

const CardFooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBlock: theme.spacing.xsmall,
  paddingInline: theme.spacing.medium,
  borderTop: theme.borders.default,
}))

const WorkbenchCardSC = styled(Card)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  cursor: 'pointer',
  '& button': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover:not(:has(button:hover))': {
    backgroundColor: theme.colors['fill-one-hover'],
    borderColor: theme.colors['border-fill-one'],
    [`${CardFooterSC}`]: {
      borderTopColor: theme.colors['border-fill-one'],
    },
  },
}))

const DescriptionReserveSC = styled.div(({ theme }) => ({
  flexShrink: 0,
  minHeight: `calc((${theme.partials.text.body2.lineHeight}) * ${WORKBENCH_CARD_DESC_VISIBLE_LINES})`,
  minWidth: 0,
}))

const MetadataGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: theme.spacing.small,
  rowGap: theme.spacing.xsmall,
  alignItems: 'center',
  minWidth: 0,
}))

const MetadataLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))

const MetadataValueSC = styled.div({
  minWidth: 0,
})

const CreateCardSC = styled(Card)(({ theme }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: WORKBENCH_LIST_CARD_MIN_HEIGHT_PX,
  padding: theme.spacing.medium,
  textDecoration: 'none',
  background: 'transparent',
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
  color: theme.colors['text-xlight'],

  '&:hover': {
    backgroundColor: theme.colors['fill-zero-hover'],
    borderStyle: 'solid',
    color: theme.colors.text,
  },
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
}))
