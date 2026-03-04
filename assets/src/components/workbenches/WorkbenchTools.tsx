import {
  ArrowRightIcon,
  Button,
  Card,
  Chip,
  Flex,
  IconFrame,
  PlusIcon,
} from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P, OverlineH3, Title2H1 } from 'components/utils/typography/Text'
import {
  WorkbenchToolFragment,
  WorkbenchToolType,
  useWorkbenchToolsQuery,
} from 'generated/graphql'
import { useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'

const TOOL_TYPE_CARDS: {
  type: WorkbenchToolType
  label: string
  description: string
  tags: string[]
}[] = [
  {
    type: WorkbenchToolType.Http,
    label: 'HTTP',
    description:
      'Call arbitrary HTTP endpoints. Use for webhooks, REST APIs, and custom integrations.',
    tags: ['Integration'],
  },
  {
    type: WorkbenchToolType.Elastic,
    label: 'Elasticsearch',
    description:
      'Query logs and search data in Elasticsearch. Connect with basic auth.',
    tags: ['Logs'],
  },
  {
    type: WorkbenchToolType.Prometheus,
    label: 'Prometheus',
    description:
      'Query metrics from Prometheus or Prometheus-compatible stores (e.g. Mimir).',
    tags: ['Metrics'],
  },
  {
    type: WorkbenchToolType.Loki,
    label: 'Loki',
    description:
      'Query log data from Grafana Loki. Supports multi-tenant setups.',
    tags: ['Logs'],
  },
  {
    type: WorkbenchToolType.Tempo,
    label: 'Tempo',
    description: 'Query trace data from Grafana Tempo for distributed tracing.',
    tags: ['Traces'],
  },
  {
    type: WorkbenchToolType.Datadog,
    label: 'Datadog',
    description:
      'Connect to Datadog for metrics, logs, and APM. Configure via API and app keys.',
    tags: ['Metrics', 'Logs'],
  },
]

export function WorkbenchTools() {
  const [addingToolType, setAddingToolType] =
    useState<WorkbenchToolType | null>(null)
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchToolsQuery,
      keyPath: ['workbenchTools'],
    })
  const tools = mapExistingNodes(data?.workbenchTools)

  return (
    <WrapperSC>
      {addingToolType === null && (
        <>
          <StackedText
            first={
              <Flex
                align="center"
                height={40}
                gap="xsmall"
              >
                <IconFrame
                  size="small"
                  icon={<PlusIcon />}
                />
                <span>Tools</span>
              </Flex>
            }
            firstPartialType="body2Bold"
            firstColor="text"
            second="Setup and integrate your observability, infra, code, and custom tools using MCP, APIs, and webhooks natively with Plural."
            secondPartialType="body2"
            secondColor="text-light"
            gap="xsmall"
            css={{ maxWidth: 840 }}
          />
          <OverlineH3 $color="text-light">Available tools</OverlineH3>
        </>
      )}
      {error && <GqlError error={error} />}
      {addingToolType !== null ? (
        <>
          <Title2H1>
            Add{' '}
            {TOOL_TYPE_CARDS.find((c) => c.type === addingToolType)?.label ??
              addingToolType}{' '}
            tool
          </Title2H1>
          <AddToolPlaceholder
            toolType={addingToolType}
            onCancel={() => setAddingToolType(null)}
            onCompleted={() => setAddingToolType(null)}
          />
        </>
      ) : (
        <>
          <ToolTypeCardsRow onAdd={(type) => setAddingToolType(type)} />
          <OverlineH3 $color="text-light">
            Enabled tools ({tools.length})
          </OverlineH3>
          {!data && loading ? (
            <CardGridSkeleton count={6} />
          ) : (
            <CardGrid
              onBottomReached={() =>
                !loading && pageInfo?.hasNextPage && fetchNextPage()
              }
            >
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                />
              ))}
            </CardGrid>
          )}
        </>
      )}
    </WrapperSC>
  )
}

type ToolTypeCardsRowProps = {
  onAdd: (type: WorkbenchToolType) => void
}

function ToolTypeCardsRow({ onAdd }: ToolTypeCardsRowProps) {
  return (
    <ToolTypeRowSC>
      {TOOL_TYPE_CARDS.map(({ type, label, description, tags }) => (
        <AppCardSC key={type}>
          <Flex
            direction="column"
            gap="medium"
          >
            <Flex
              direction="column"
              gap="small"
            >
              <Flex
                align="center"
                gap="small"
              >
                <IconFrame
                  size="small"
                  icon={<PlusIcon />}
                />
                <span css={{ fontWeight: 600, fontSize: 20 }}>{label}</span>
              </Flex>
              <Body2P
                $color="text-light"
                css={{
                  height: 40,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {description}
              </Body2P>
              <Flex
                gap="xsmall"
                wrap="wrap"
              >
                {tags.map((tag) => (
                  <Chip key={tag}>{tag}</Chip>
                ))}
              </Flex>
            </Flex>
            <Button
              width="100%"
              startIcon={<PlusIcon />}
              secondary
              onClick={(e) => {
                e.stopPropagation()
                onAdd(type)
              }}
            >
              Add connection
            </Button>
          </Flex>
        </AppCardSC>
      ))}
      <CustomCardSC onClick={() => onAdd(WorkbenchToolType.Http)}>
        <Button
          startIcon={<PlusIcon />}
          secondary
          onClick={(e) => {
            e.stopPropagation()
            onAdd(WorkbenchToolType.Http)
          }}
        >
          Add custom integration
        </Button>
      </CustomCardSC>
    </ToolTypeRowSC>
  )
}

type AddToolPlaceholderProps = {
  toolType: WorkbenchToolType
  onCancel: () => void
  onCompleted: () => void
}

function AddToolPlaceholder({
  toolType,
  onCancel,
  onCompleted,
}: AddToolPlaceholderProps) {
  const label =
    TOOL_TYPE_CARDS.find((c) => c.type === toolType)?.label ?? toolType
  return (
    <Card css={{ padding: 'large' }}>
      <Flex
        direction="column"
        gap="medium"
      >
        <Body2P $color="text-light">
          Form fields for {label} connection will go here (placeholder). Only
          the fields relevant to this connection type will be shown.
        </Body2P>
        <Flex gap="small">
          <Button
            onClick={onCancel}
            secondary
          >
            Cancel
          </Button>
          <Button onClick={onCompleted}>Save (placeholder)</Button>
        </Flex>
      </Flex>
    </Card>
  )
}

function ToolCard({ tool }: { tool: WorkbenchToolFragment }) {
  const { spacing } = useTheme()
  const typeLabel =
    TOOL_TYPE_CARDS.find((c) => c.type === tool.tool)?.label ?? tool.tool
  const categoryLabels = (tool.categories ?? []).filter(Boolean) as string[]
  return (
    <CardSC>
      <Flex
        direction="column"
        gap="medium"
      >
        <Flex
          align="center"
          gap="small"
        >
          <IconFrame
            size="small"
            icon={<PlusIcon />}
          />
          <Flex
            direction="column"
            gap="xxsmall"
          >
            <span css={{ fontWeight: 600, fontSize: 14 }}>{tool.name}</span>
            <Body2P
              $color="text-light"
              css={{ fontSize: 12 }}
            >
              {typeLabel}
            </Body2P>
          </Flex>
        </Flex>
        {categoryLabels.length > 0 && (
          <Flex
            gap="xsmall"
            wrap="wrap"
          >
            {categoryLabels.map((cat) => (
              <Chip key={cat}>{cat}</Chip>
            ))}
          </Flex>
        )}
      </Flex>
      <ArrowRightIcon
        color="icon-xlight"
        size={spacing.xlarge}
        css={{ alignSelf: 'flex-end', padding: spacing.xsmall }}
      />
    </CardSC>
  )
}

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  height: '100%',
  textDecoration: 'none',
}))

const ToolTypeRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.large,
}))

const AppCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  minWidth: 320,
  maxWidth: 374,
  flex: '1 1 320px',
  padding: theme.spacing.large,
  gap: theme.spacing.medium,
}))

const CustomCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  minWidth: 320,
  maxWidth: 374,
  flex: '1 1 320px',
  padding: theme.spacing.large,
  borderStyle: 'dashed',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
}))
