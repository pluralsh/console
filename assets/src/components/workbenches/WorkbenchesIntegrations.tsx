import {
  Button,
  Card,
  Chip,
  Flex,
  IconFrame,
  AddIcon,
  ApiIcon,
} from '@pluralsh/design-system'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { Link } from 'react-router-dom'
import { WORKBENCHES_TOOLS_CREATE_ABS_PATH } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import {
  TOOL_TYPE_CARDS,
  WorkbenchToolCardBody,
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from './tools/workbenchToolsUtils'

const WORKBENCH_TOOL_TYPE_PARAM = 'type'

export function WorkbenchesIntegrations() {
  const { spacing } = useTheme()

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        icon={<ApiIcon />}
        title="Integrations"
        description="Integrate your dev stack, including observability, ticketing, MCP, and Cloud services with Plural."
      />
      <CardGrid styles={workbenchToolCardGridStyles(280)}>
        {TOOL_TYPE_CARDS.map(({ type, description, label, categoryLabels }) => (
          <ToolCardSC key={type}>
            <WorkbenchToolCardBody>
              <StackedText
                first={
                  <Flex
                    align="center"
                    gap="medium"
                  >
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
                    {label}
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
                to={`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${WORKBENCH_TOOL_TYPE_PARAM}=${type}`}
                style={{
                  boxShadow: 'none',
                  marginTop: 'auto',
                  paddingTop: spacing.xsmall,
                }}
                startIcon={<AddIcon />}
              >
                Add tool
              </Button>
            </WorkbenchToolCardBody>
          </ToolCardSC>
        ))}
      </CardGrid>
    </WorkbenchTabWrapper>
  )
}

const ToolCardSC = styled(Card)(() => ({
  '&&': {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    minWidth: 0,
    overflow: 'visible',
  },
  minHeight: 120,
  textDecoration: 'none',
}))
