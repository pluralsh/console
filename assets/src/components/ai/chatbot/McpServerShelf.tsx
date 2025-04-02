import {
  Accordion,
  AccordionItem,
  Flex,
  GearTrainIcon,
  HamburgerMenuCollapsedIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { Body2BoldP } from 'components/utils/typography/Text'
import { McpServerToolFragment } from 'generated/graphql'
import { Link } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import styled from 'styled-components'

const HEADER_HEIGHT = 69

export function McpServerShelf({
  isOpen,
  setIsOpen,
  fullscreen,
  tools,
}: {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  fullscreen: boolean
  tools: McpServerToolFragment[]
}) {
  const value = isOpen ? ARBITRARY_VALUE_NAME : ''
  return (
    <Accordion
      type="single"
      value={value}
      orientation="horizontal"
      css={{ border: 'none', maxWidth: '50%' }}
    >
      <AccordionItem
        value={ARBITRARY_VALUE_NAME}
        caret="none"
        padding="none"
        trigger={null}
        css={{ height: '100%' }}
      >
        <WrapperSC $fullscreen={fullscreen}>
          <HeaderSC $fullscreen={fullscreen}>
            <Body2BoldP>MCP servers</Body2BoldP>
            <Flex gap="xsmall">
              <IconFrame
                clickable
                as={Link}
                type="secondary"
                to={AI_MCP_SERVERS_ABS_PATH}
                tooltip="Go to MCP server settings"
                icon={<GearTrainIcon />}
              />
              <IconFrame
                clickable
                type="secondary"
                icon={<HamburgerMenuCollapsedIcon />}
                onClick={() => setIsOpen(!isOpen)}
                tooltip="Close panel"
              />
            </Flex>
          </HeaderSC>
          <div>
            {tools.map((tool, i) => (
              <div key={i}>
                <span>server: {tool.server?.name}</span>
                <span>tool: {tool.tool?.name}</span>
              </div>
            ))}
          </div>
        </WrapperSC>
      </AccordionItem>
    </Accordion>
  )
}

const WrapperSC = styled.div<{ $fullscreen?: boolean }>(
  ({ $fullscreen, theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: 320,
    ...($fullscreen && {
      gap: theme.spacing.medium,
    }),
  })
)

const HeaderSC = styled.div<{ $fullscreen: boolean }>(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: HEADER_HEIGHT,
  background: theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))
