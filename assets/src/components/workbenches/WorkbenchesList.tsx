import {
  ArrowRightIcon,
  Card,
  Flex,
  AddIcon,
  Tooltip,
} from '@pluralsh/design-system'
import * as DesignSystem from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { Body2BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  AgentRuntimeType,
  WorkbenchTinyFragment,
  useWorkbenchesQuery,
} from 'generated/graphql'
import { Link } from 'react-router-dom'
import { WORKBENCHES_CREATE_REL_PATH } from 'routes/workbenchesRoutesConsts'
import {
  cloneElement,
  ComponentType,
  isValidElement,
  ReactElement,
  ReactNode,
} from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from './tools/workbenchToolsUtils'
import { getWebhookIcon } from './workbench/webhooks/utils'

const MAX_VISIBLE_METADATA_ITEMS = 5
const METADATA_ICON_SIZE = 12
const WORKBENCH_CARD_MIN_WIDTH = 340

const WorkbenchIcon = (DesignSystem as { WorkbenchIcon?: ComponentType })
  .WorkbenchIcon

export function WorkbenchesList() {
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchesQuery,
      keyPath: ['workbenches'],
    })

  const workbenches = mapExistingNodes(data?.workbenches)

  return (
    <WrapperSC>
      <WorkbenchTabHeader
        title="Workbenches"
        icon={WorkbenchIcon ? <WorkbenchIcon /> : undefined}
        description="Build-your-own agents for common DevOps tasks. Each workbench bundles tools and skills that and orchestrates subagents tailored to observability, infra analysis and coding tasks."
      />
      {error && <GqlError error={error} />}
      {!data && loading ? (
        <CardGridSkeleton
          count={6}
          styles={workbenchToolCardGridStyles(WORKBENCH_CARD_MIN_WIDTH)}
        />
      ) : (
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
            />
          ))}
        </CardGrid>
      )}
    </WrapperSC>
  )
}

function WorkbenchCard({ workbench }: { workbench: WorkbenchTinyFragment }) {
  const theme = useTheme()

  const {
    id,
    name,
    description,
    agentRuntime,
    tools: t,
    webhooks: w,
  } = workbench

  const tools = t?.filter(isNonNullable) ?? []

  const webhooks = mapExistingNodes(w)

  const RuntimeIcon =
    runtimeToIcon[agentRuntime?.type ?? AgentRuntimeType.Custom]

  return (
    <CardSC
      clickable
      forwardedAs={Link}
      to={id}
    >
      <Body2BoldP>{name}</Body2BoldP>
      <Body2P
        css={{
          color: theme.colors['text-light'],
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 3,
          overflow: 'hidden',
        }}
      >
        {description}
      </Body2P>
      <Flex
        gap="small"
        align="flex-end"
        justify="space-between"
      >
        <MetadataGridSC>
          <MetadataLabelSC>coding agent</MetadataLabelSC>
          <MetadataValueSC>
            {agentRuntime?.name ? (
              <Flex
                align="center"
                gap="xxsmall"
                minWidth={0}
              >
                <RuntimeIcon
                  fullColor
                  size={12}
                />
                <CaptionP
                  $color="text-xlight"
                  css={{ ...TRUNCATE_LEFT, minWidth: 0 }}
                >
                  {agentRuntime.name}
                </CaptionP>
              </Flex>
            ) : (
              <CaptionP $color="text-xlight">-</CaptionP>
            )}
          </MetadataValueSC>

          <MetadataLabelSC>webhooks</MetadataLabelSC>
          <MetadataValueSC>
            <MetadataIcons
              items={webhooks.map((webhook) => ({
                id: webhook.id,
                label: webhook.name ?? 'Webhook',
                icon: <span>{withIconSize(getWebhookIcon(webhook))}</span>,
              }))}
            />
          </MetadataValueSC>

          <MetadataLabelSC>bound tools</MetadataLabelSC>
          <MetadataValueSC>
            <MetadataIcons
              items={tools.map((tool) => ({
                id: tool.id,
                label: tool.name,
                icon: (
                  <WorkbenchToolIcon
                    type={tool.tool}
                    provider={tool.cloudConnection?.provider}
                    size={METADATA_ICON_SIZE}
                  />
                ),
              }))}
            />
          </MetadataValueSC>
        </MetadataGridSC>
        <ArrowRightIcon
          color="icon-xlight"
          marginRight="xsmall"
        />
      </Flex>
    </CardSC>
  )
}

function MetadataIcons({
  items,
}: {
  items: Array<{ id: string; label: string; icon: ReactNode }>
}) {
  if (!items.length) return <CaptionP $color="text-xlight">-</CaptionP>

  const visibleItems = items.slice(0, MAX_VISIBLE_METADATA_ITEMS)
  const hiddenItems = items.slice(MAX_VISIBLE_METADATA_ITEMS)
  const hiddenItemsLabel = hiddenItems.map(({ label }) => label).join(', ')

  return (
    <Flex
      align="center"
      gap="xsmall"
      wrap="wrap"
    >
      {visibleItems.map((item) => (
        <Tooltip
          key={item.id}
          label={item.label}
          placement="bottom"
        >
          <span>{item.icon}</span>
        </Tooltip>
      ))}
      {!!hiddenItems.length && (
        <Tooltip
          label={hiddenItemsLabel || `${hiddenItems.length} more`}
          placement="bottom"
        >
          <CaptionP $color="text-xlight">+{hiddenItems.length}</CaptionP>
        </Tooltip>
      )}
    </Flex>
  )
}

function withIconSize(icon: ReactElement): ReactElement {
  if (!isValidElement(icon)) return icon

  return cloneElement(icon as ReactElement<{ size?: number }>, {
    size: METADATA_ICON_SIZE,
  })
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  height: '100%',
  minHeight: 180,
  textDecoration: 'none',
}))

const MetadataGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: theme.spacing.small,
  rowGap: theme.spacing.xxsmall,
  alignItems: 'center',
  flex: 1,
  minWidth: 0,
}))

const MetadataLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))

const MetadataValueSC = styled.div({
  minWidth: 0,
})

const CreateCardSC = styled(CardSC)(({ theme }) => ({
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
