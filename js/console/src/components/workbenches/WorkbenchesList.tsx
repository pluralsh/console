import { POLL_INTERVAL } from 'components/cluster/constants'
import {
  AddIcon,
  Button,
  Card,
  CaretRightIcon,
  Flex,
} from '@pluralsh/design-system'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
import * as DesignSystem from '@pluralsh/design-system'
import { useProjectId } from 'components/contexts/ProjectsContext'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import { PageSidecarPortal } from 'components/layout/PageLayout'
import { ToolbarSearchInput } from 'components/layout/PageToolbar'
import { WorkbenchStat } from 'components/workbenches/common/WorkbenchStatCard'
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
import {
  Body1BoldP,
  Body2BoldP,
  Body2P,
} from 'components/utils/typography/Text'
import {
  WorkbenchTinyFragment,
  useWorkbenchesSummaryQuery,
} from 'generated/graphql'
import { WorkbenchesDocument } from 'generated/graphql-documents'
import { Link } from 'react-router-dom'
import {
  WORKBENCHES_CREATE_ABS_PATH,
  getWorkbenchAbsPath,
} from 'routes/workbenchesRoutesConsts'
import { ComponentType, useEffect, useMemo, useState } from 'react'
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
const WorkbenchIcon = (DesignSystem as { WorkbenchIcon?: ComponentType })
  .WorkbenchIcon

export function WorkbenchesList() {
  const theme = useTheme()
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
      {
        pollInterval: POLL_INTERVAL,
        query: WorkbenchesDocument,
        keyPath: ['workbenches'],
      },
      { q: debouncedSearchString, projectId, ...sortVariables }
    )

  // The table reports its visible slice for polling but doesn't clear it on
  // unmount, so card view would keep refreshing the table's old rows.
  useEffect(() => {
    if (display.view !== 'list') setVirtualSlice(undefined)
  }, [display.view, setVirtualSlice])

  const workbenches = useMemo(
    () => mapExistingNodes(data?.workbenches),
    [data?.workbenches]
  )
  const hasActiveSearch = !!debouncedSearchString
  const showSearchEmptyState = hasActiveSearch && workbenches.length === 0

  const workbenchCount =
    !data && loading
      ? null
      : `${workbenches.length}${pageInfo?.hasNextPage ? '+' : ''}`

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
    if (workbenches.length === 0 && !pageInfo?.hasNextPage)
      return (
        <WorkbenchEmptyState
          inset={false}
          message="No workbenches yet"
          description="Create a workbench to bundle tools and skills for an agent."
        >
          <Button
            as={Link}
            to={WORKBENCHES_CREATE_ABS_PATH}
            startIcon={<AddIcon />}
          >
            Create workbench
          </Button>
        </WorkbenchEmptyState>
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
        description={
          <>
            Agents to manage production. Bundles tools and skills, and
            orchestrates subagents to automate your busywork.{' '}
            <InlineLink
              href="https://docs.plural.sh/plural-features/workbenches"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </InlineLink>
          </>
        }
      />
      <WorkbenchesSummary projectId={projectId} />
      <ListSectionSC>
        <ListHeaderSC>
          <Body1BoldP>
            All workbenches{' '}
            {workbenchCount && (
              <span css={{ color: theme.colors['text-xlight'] }}>
                {workbenchCount}
              </span>
            )}
          </Body1BoldP>
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
            <Button
              small
              as={Link}
              to={WORKBENCHES_CREATE_ABS_PATH}
              startIcon={<AddIcon />}
            >
              Create workbench
            </Button>
          </Flex>
        </ListHeaderSC>
        {error && <GqlError error={error} />}
        {content()}
      </ListSectionSC>
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
  const { data, loading, error } = useWorkbenchesSummaryQuery({
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  })
  const aggregates = data?.workbenchAggregates
  const isLoading = !data && loading

  if (error) return <GqlError error={error} />

  return (
    <SummaryStripSC>
      <SummaryCellSC>
        <WorkbenchStat
          label="PR efficiency"
          value={formatPrEfficiency(
            aggregates?.pullRequests ?? 0,
            aggregates?.pullRequestMergeRate
          )}
          helper="PRs merged (merge rate), over lifetime"
          loading={isLoading}
        />
      </SummaryCellSC>
      <SummaryCellSC>
        <WorkbenchStat
          label="Hours saved"
          value={formatHours(aggregates?.hoursSaved ?? 0)}
          helper="Estimated from the size of merged PRs"
          info={<HoursSavedInfo />}
          loading={isLoading}
        />
      </SummaryCellSC>
      <SummaryCellSC>
        <WorkbenchStat
          label="Tokens consumed"
          value={formatTokenCount(aggregates?.totalTokens ?? 0) ?? '0'}
          helper="Over lifetime"
          loading={isLoading}
        />
      </SummaryCellSC>
    </SummaryStripSC>
  )
}

// Static MathML: React's JSX types don't include MathML elements.
// Mirrors PullRequest.aggregates/1 in lib/console/schema/pull_request.ex.
const HOURS_SAVED_FORMULA =
  '<math display="block"><mi>h</mi><mo>=</mo>' +
  '<munder><mo mathsize="1.6em">&#x2211;</mo><mtext>merged PRs</mtext></munder>' +
  '<mi>max</mi><mrow><mo mathsize="1.8em">(</mo><mfrac><mn>1</mn><mn>4</mn></mfrac><mo>,</mo>' +
  '<mfrac><mrow><mi>min</mi><mo>(</mo><mi>L</mi><mo>,</mo><mn>2000</mn><mo>)</mo></mrow>' +
  '<mi>r</mi></mfrac><mo mathsize="1.8em">)</mo></mrow></math>'

function HoursSavedInfo() {
  return (
    <div css={{ maxWidth: 280 }}>
      <div
        css={{ fontSize: 16, margin: '4px 0 8px' }}
        dangerouslySetInnerHTML={{ __html: HOURS_SAVED_FORMULA }}
      />
      L is lines changed; r is lines per hour: 150 for GitOps, 100 for config,
      50 for app code.
    </div>
  )
}

function formatPrEfficiency(merged: number, rate: Nullable<number>) {
  const count = merged.toLocaleString()

  return isNonNullable(rate) ? `${count} (${Math.round(rate * 100)}%)` : count
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

const SummaryStripSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  flexShrink: 0,
  borderTop: theme.borders.default,
  borderBottom: theme.borders.default,
}))

const SummaryCellSC = styled.div(({ theme }) => ({
  flex: 1,
  minWidth: 200,
  padding: theme.spacing.large,
  '& + &': {
    borderLeft: theme.borders.default,
  },
}))

const ListSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  flex: 1,
  minHeight: 0,
}))

const ListHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
  flexShrink: 0,
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xlarge,
  overflow: 'hidden',
  height: '100%',
}))
