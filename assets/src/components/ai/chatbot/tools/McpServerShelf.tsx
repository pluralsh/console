import {
  Accordion,
  AccordionItem,
  Chip,
  EyeIcon,
  Flex,
  GearTrainIcon,
  HamburgerMenuCollapsedIcon,
  IconFrame,
  ToolIcon,
} from '@pluralsh/design-system'
import { useChatbot } from 'components/ai/AIContext'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE } from 'components/utils/truncate'
import { Body1P, Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { McpServerToolFragment, McpToolFragment } from 'generated/graphql'
import { groupBy } from 'lodash'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AI_MCP_SERVERS_ABS_PATH } from 'routes/aiRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { ToolDetailsModal } from './ToolDetailsModal'

type ServerWithTools = {
  name: Nullable<string>
  url: Nullable<string>
  confirm: Nullable<boolean>
  tools: McpToolFragment[]
}

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
  const { borders, spacing } = useTheme()
  const { closeChatbot } = useChatbot()
  const value = isOpen ? ARBITRARY_VALUE_NAME : ''
  const [selectedToolDetails, setSelectedToolDetails] = useState<{
    serverName: string
    tool: McpToolFragment
  } | null>(null)

  const serversWithTools: ServerWithTools[] = Object.entries(
    groupBy(tools, ({ server }) => server?.name)
  ).map(([_, tools]) => ({
    name: tools[0]?.server?.name,
    url: tools[0]?.server?.url,
    confirm: tools[0]?.server?.confirm,
    tools: tools.map((tool) => tool.tool).filter(isNonNullable),
  }))

  return (
    <WrapperAccordionSC
      type="single"
      value={value}
      orientation="horizontal"
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
                onClick={() => closeChatbot()}
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
          <ContentAccordionSC
            type="multiple"
            $fullscreen={fullscreen}
          >
            {serversWithTools.map((server) => (
              <AccordionItem
                key={server.name}
                paddingArea="trigger-only"
                css={{ borderBottom: borders.input }}
                trigger={
                  <Flex
                    direction="column"
                    gap="small"
                  >
                    {server.confirm && (
                      <Chip
                        size="small"
                        css={{ width: 'fit-content' }}
                      >
                        Confirmation required
                      </Chip>
                    )}
                    <StackedText
                      first={server.name ?? 'Unknown MCP server'}
                      firstPartialType="body2Bold"
                      firstColor="text"
                      second={server.url}
                    />
                  </Flex>
                }
              >
                {server.tools.length === 0 && (
                  <Body1P
                    $color="text-light"
                    css={{ textAlign: 'center', paddingBottom: spacing.medium }}
                  >
                    No tools found.
                  </Body1P>
                )}
                {server.tools.map((tool) => (
                  <ToolRowSC key={tool.name}>
                    <Flex
                      paddingLeft={40}
                      alignItems="center"
                      gap="xsmall"
                      minWidth={0}
                    >
                      <ToolIcon />
                      <Body2P css={TRUNCATE}>{tool.name}</Body2P>
                    </Flex>
                    <IconFrame
                      clickable
                      tooltip="View tool"
                      icon={<EyeIcon />}
                      onClick={() =>
                        setSelectedToolDetails({
                          serverName: server.name ?? '',
                          tool,
                        })
                      }
                    />
                  </ToolRowSC>
                ))}
              </AccordionItem>
            ))}
          </ContentAccordionSC>
        </WrapperSC>
      </AccordionItem>
      <ToolDetailsModal
        open={selectedToolDetails !== null}
        onClose={() => setSelectedToolDetails(null)}
        serverName={selectedToolDetails?.serverName ?? ''}
        tool={selectedToolDetails?.tool}
      />
    </WrapperAccordionSC>
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

const HeaderSC = styled.div<{ $fullscreen: boolean }>(
  ({ theme, $fullscreen }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: theme.borders['fill-two'],
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    ...($fullscreen
      ? {
          minHeight: 75,
          border: theme.borders.input,
          borderRadius: theme.borderRadiuses.large,
          background: theme.colors['fill-one'],
        }
      : {
          minHeight: 69,
          background: theme.colors['fill-two'],
          borderBottom: theme.borders['fill-two'],
        }),
  })
)

const WrapperAccordionSC = styled(Accordion)({
  border: 'none',
  background: 'none',
  maxWidth: '50%',
})

const ContentAccordionSC = styled(Accordion)<{ $fullscreen: boolean }>(
  ({ $fullscreen, theme }) => ({
    border: 'none',
    background: theme.colors['fill-one'],
    height: '100%',
    overflow: 'auto',
    ...($fullscreen && {
      border: theme.borders.input,
      borderRadius: theme.borderRadiuses.large,
      background: theme.colors['fill-one'],
    }),
  })
)

const ToolRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  padding: theme.spacing.small,
  borderTop: theme.borders.input,
  background: theme.colors['fill-one-selected'],
}))
