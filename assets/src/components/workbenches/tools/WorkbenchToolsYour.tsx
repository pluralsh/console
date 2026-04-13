import { Card, Chip, Flex, IconFrame } from '@pluralsh/design-system'
import {
  CardGrid,
  CardGridSkeleton,
} from 'components/self-service/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { useWorkbenchToolsQuery } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { Link } from 'react-router-dom'
import { getWorkbenchToolEditAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  categoryToLabel,
  TOOL_TYPE_TO_LABEL,
  WorkbenchToolIcon,
} from './workbenchToolsUtils'

export function WorkbenchToolsYour() {
  const { data, error, loading, pageInfo, fetchNextPage } =
    useFetchPaginatedData({
      queryHook: useWorkbenchToolsQuery,
      keyPath: ['workbenchTools'],
    })
  const tools = mapExistingNodes(data?.workbenchTools)

  return (
    <WorkbenchTabWrapper>
      {data && !isEmpty(tools) && (
        <Subtitle1H1>Your created tools ({tools.length})</Subtitle1H1>
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
                to={getWorkbenchToolEditAbsPath(id)}
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
