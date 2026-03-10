import {
  ArrowScroll,
  Button,
  Card,
  Chip,
  Divider,
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
import { Subtitle1H1 } from 'components/utils/typography/Text'
import {
  WorkbenchToolFragment,
  useWorkbenchToolsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import { WORKBENCHES_CREATE_REL_PATH } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchToolIcon } from './WorkbenchTool'
import {
  TOOL_TYPE_CARDS,
  TOOL_TYPE_TO_CATEGORIES,
  TOOL_TYPE_TO_LABEL,
} from './workbenchToolsConsts'

const WORKBENCH_TOOL_TYPE_PARAM = 'type'

export function WorkbenchTools() {
  const { spacing } = useTheme()
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchToolsQuery,
      keyPath: ['workbenchTools'],
    })
  const tools = mapExistingNodes(data?.workbenchTools)

  return (
    <WrapperSC>
      <StackedText
        first="Tools"
        firstPartialType="subtitle1"
        firstColor="text"
        second="Integrate external observability provider tools with your workbenches."
        secondPartialType="body1"
        secondColor="text-xlight"
        gap="xsmall"
        css={{ maxWidth: 840 }}
      />
      <Subtitle1H1>Connection types</Subtitle1H1>
      <ArrowScroll
        showArrow={false}
        color="fill-zero"
        opacity={0.6}
      >
        <Flex gap="large">
          {TOOL_TYPE_CARDS.map(({ type, description }) => (
            <ToolCardSC key={type}>
              <StackedText
                first={
                  <Flex
                    align="center"
                    gap="medium"
                  >
                    <IconFrame
                      circle
                      type="secondary"
                      icon={<WorkbenchToolIcon type={type} />}
                    />
                    {TOOL_TYPE_TO_LABEL[type]}
                  </Flex>
                }
                firstPartialType="subtitle1"
                firstColor="text"
                second={description}
                secondPartialType="body2"
                secondColor="text-light"
                gap="small"
              />
              <Flex
                gap="xsmall"
                wrap="wrap"
                flex={1}
              >
                {TOOL_TYPE_TO_CATEGORIES[type].map((tag) => (
                  <Chip
                    key={tag}
                    size="small"
                    css={{ height: 'fit-content' }}
                  >
                    {tag}
                  </Chip>
                ))}
              </Flex>
              <Button
                small
                floating
                as={Link}
                to={`${WORKBENCHES_CREATE_REL_PATH}?${WORKBENCH_TOOL_TYPE_PARAM}=${type}`}
                style={{ boxShadow: 'none', marginTop: spacing.xsmall }}
                startIcon={<PlusIcon />}
              >
                Add tool
              </Button>
            </ToolCardSC>
          ))}
        </Flex>
      </ArrowScroll>
      {data && !isEmpty(tools) && (
        <>
          <Divider backgroundColor="border" />
          <Subtitle1H1>Your created tools ({tools.length})</Subtitle1H1>
        </>
      )}
      {error && <GqlError error={error} />}
      {!data && loading ? (
        <CardGridSkeleton count={6} />
      ) : (
        !isEmpty(tools) && (
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
        )
      )}
    </WrapperSC>
  )
}

function ToolCard({ tool }: { tool: WorkbenchToolFragment }) {
  const { id, name, tool: type, categories } = tool

  return (
    <ToolCardSC
      clickable
      forwardedAs={Link}
      to={id}
    >
      <StackedText
        first={name}
        firstPartialType="body2Bold"
        firstColor="text"
        second={TOOL_TYPE_TO_LABEL[type]}
        icon={
          <IconFrame
            circle
            type="secondary"
            icon={<WorkbenchToolIcon type={type} />}
          />
        }
      />
      {/* TODO: potentially add custom description field here */}
      <Flex
        gap="xsmall"
        wrap="wrap"
      >
        {categories?.map((cat, i) => (
          <Chip
            key={i}
            size="small"
          >
            {cat}
          </Chip>
        ))}
      </Flex>
    </ToolCardSC>
  )
}

const ToolCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.large,
  minHeight: '100%',
  textDecoration: 'none',
  minWidth: 320,
}))

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  overflow: 'hidden',
  height: '100%',
}))
