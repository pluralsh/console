import {
  ArrowScroll,
  Button,
  Card,
  Chip,
  Divider,
  Flex,
  IconFrame,
  AddIcon,
} from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useWorkbenchToolsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import { WORKBENCHES_CREATE_REL_PATH } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import {
  categoryToLabel,
  TOOL_TYPE_CARDS,
  TOOL_TYPE_TO_LABEL,
  WorkbenchToolIcon,
} from './workbenchToolsUtils'
import { isNonNullable } from 'utils/isNonNullable'

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
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        title="Tools"
        description="Setup and integrate your observability, infra, code, and custom tools using MCP, APIs, and webhooks natively with Plural."
      />
      <Subtitle1H1>Connection types</Subtitle1H1>
      <ArrowScroll
        showArrow={false}
        color="fill-zero"
        opacity={0.6}
      >
        <Flex gap="large">
          {TOOL_TYPE_CARDS.map(
            ({ type, description, label, categoryLabels }) => (
              <ToolCardSC
                key={type}
                css={{ minWidth: 320 }}
              >
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
                      {label}
                    </Flex>
                  }
                  firstPartialType="subtitle1"
                  firstColor="text"
                  second={isEmpty(tools) ? description : ''}
                  secondPartialType="body2"
                  secondColor="text-light"
                  gap="small"
                />
                <Flex
                  gap="xsmall"
                  wrap="wrap"
                  flex={1}
                >
                  {categoryLabels.map((cat) => (
                    <Chip
                      key={cat}
                      size="small"
                      css={{ height: 'fit-content' }}
                    >
                      {cat}
                    </Chip>
                  ))}
                </Flex>
                <Button
                  small
                  floating
                  as={Link}
                  to={`${WORKBENCHES_CREATE_REL_PATH}?${WORKBENCH_TOOL_TYPE_PARAM}=${type}`}
                  style={{ boxShadow: 'none', marginTop: spacing.xsmall }}
                  startIcon={<AddIcon />}
                >
                  Add tool
                </Button>
              </ToolCardSC>
            )
          )}
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
            styles={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            }}
          >
            {tools.map(({ id, name, tool: type, categories }) => (
              <ToolCardSC
                key={id}
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
                <Flex
                  gap="xsmall"
                  wrap="wrap"
                >
                  {categories?.filter(isNonNullable).map((cat, i) => (
                    <Chip
                      key={i}
                      size="small"
                    >
                      {categoryToLabel[cat]}
                    </Chip>
                  ))}
                </Flex>
              </ToolCardSC>
            ))}
          </CardGrid>
        )
      )}
    </WorkbenchTabWrapper>
  )
}

const ToolCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.large,
  minHeight: 120,
  textDecoration: 'none',
}))
