import {
  ArrowRightIcon,
  Button,
  Card,
  Chip,
  Divider,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
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
import { getWorkbenchToolEditAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  categoryToLabel,
  TOOL_TYPE_TO_LABEL,
  WorkbenchToolCardBody,
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from './workbenchToolsUtils'
import { useNavigate } from 'react-router-dom'
import { ConfiguredToolMetadata } from './ConfiguredToolMetadata'

export function ConfiguredTools() {
  const navigate = useNavigate()

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
        <CardGridSkeleton
          count={6}
          styles={workbenchToolCardGridStyles(320)}
        />
      ) : (
        !isEmpty(tools) && (
          <CardGrid
            onBottomReached={() =>
              !loading && pageInfo?.hasNextPage && fetchNextPage()
            }
            styles={workbenchToolCardGridStyles(320)}
          >
            {tools.map(({ id, name, tool: type, categories }) => (
              <ToolCardSC key={id}>
                <WorkbenchToolCardBody>
                  <StackedText
                    first={name}
                    firstPartialType="body2Bold"
                    firstColor="text"
                    second={TOOL_TYPE_TO_LABEL[type]}
                    icon={
                      <IconFrame
                        circle
                        type="secondary"
                        icon={
                          <WorkbenchToolIcon
                            size={20}
                            type={type}
                          />
                        }
                      />
                    }
                  />
                  <ConfiguredToolMetadata
                    toolId={id}
                    toolType={type}
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
                </WorkbenchToolCardBody>
                <Divider backgroundColor="border" />
                <EditButtonSC
                  endIcon={<ArrowRightIcon size={14} />}
                  small
                  tertiary
                  onClick={() => navigate(getWorkbenchToolEditAbsPath(id))}
                >
                  Edit configuration
                </EditButtonSC>
              </ToolCardSC>
            ))}
          </CardGrid>
        )
      )}
    </WorkbenchTabWrapper>
  )
}

const ToolCardSC = styled(Card)(() => ({
  minHeight: 180,
  textDecoration: 'none',

  '&&': {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    minWidth: 0,
    overflow: 'hidden',
  },
}))

const EditButtonSC = styled(Button)(() => ({
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
}))
