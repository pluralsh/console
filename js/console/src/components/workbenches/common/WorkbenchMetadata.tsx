import { Flex } from '@pluralsh/design-system'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { AgentRuntimeType, WorkbenchTinyFragment } from 'generated/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchToolIcon } from '../tools/workbenchToolsUtils'

const MAX_VISIBLE_TOOLS = 5
const METADATA_ICON_SIZE = 16

export function WorkbenchCodingAgent({
  agentRuntime,
}: Pick<WorkbenchTinyFragment, 'agentRuntime'>) {
  const RuntimeIcon =
    runtimeToIcon[agentRuntime?.type ?? AgentRuntimeType.Custom]

  if (!agentRuntime?.name) return null

  return (
    <Flex
      align="center"
      gap="xsmall"
      minWidth={0}
    >
      <RuntimeIcon
        fullColor
        size={METADATA_ICON_SIZE}
      />
      <CaptionP
        $color="text-xlight"
        css={{ ...TRUNCATE_LEFT, minWidth: 0 }}
      >
        {agentRuntime.name}
      </CaptionP>
    </Flex>
  )
}

export function WorkbenchToolIcons({
  tools,
}: Pick<WorkbenchTinyFragment, 'tools'>) {
  const items = tools?.filter(isNonNullable) ?? []

  if (!items.length) return null

  return (
    <MetadataIcons
      maxVisibleItems={MAX_VISIBLE_TOOLS}
      items={items.map((tool) => ({
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
  )
}
