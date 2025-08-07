import {
  Accordion,
  AccordionItem,
  Chip,
  CloseIcon,
  EyeIcon,
  Flex,
  GearTrainIcon,
  IconFrame,
  ToolIcon,
} from '@pluralsh/design-system'
import { SimpleFlyover } from 'components/utils/SimpleFlyover'
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
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'

type ServerWithTools = {
  name: Nullable<string>
  url: Nullable<string>
  confirm: Nullable<boolean>
  tools: McpToolFragment[]
}

export function McpServerShelf({
  isOpen,
  onClose,
  tools,
  zIndex,
}: {
  isOpen: boolean
  onClose: () => void
  tools: McpServerToolFragment[]
  zIndex?: number
}) {
  const theme = useTheme()
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
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>MCP servers</Body2BoldP>
        <Flex gap="xsmall">
          <IconFrame
            clickable
            as={Link}
            type="tertiary"
            to={AI_MCP_SERVERS_ABS_PATH}
            onClick={onClose}
            tooltip="Go to MCP server settings"
            icon={<GearTrainIcon />}
          />
          <IconFrame
            clickable
            type="tertiary"
            icon={<CloseIcon />}
            onClick={onClose}
            tooltip="Close"
          />
        </Flex>
      </HeaderSC>
      <ContentAccordionSC type="multiple">
        {serversWithTools.map((server) => (
          <AccordionItem
            key={server.name}
            paddingArea="trigger-only"
            css={{ borderBottom: theme.borders.input }}
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
                css={{
                  textAlign: 'center',
                  paddingBottom: theme.spacing.medium,
                }}
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
      <ToolDetailsModal
        open={selectedToolDetails !== null}
        onClose={() => setSelectedToolDetails(null)}
        serverName={selectedToolDetails?.serverName ?? ''}
        tool={selectedToolDetails?.tool}
      />
    </SimpleFlyover>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: theme.borders.default,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  height: CHATBOT_HEADER_HEIGHT,
}))

const ContentAccordionSC = styled(Accordion)(({ theme }) => ({
  border: 'none',
  background: theme.colors['fill-accent'],
  height: '100%',
  overflow: 'auto',
}))

const ToolRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  padding: theme.spacing.small,
  borderTop: theme.borders.input,
  background: theme.colors['fill-zero-selected'],
}))
