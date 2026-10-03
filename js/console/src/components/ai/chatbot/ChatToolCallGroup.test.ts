import { AiRole, ChatFragment, ChatType } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { groupConsecutiveToolMessages } from './ChatToolCallGroup'

const tool = (id: string, name: string): ChatFragment => ({
  id,
  role: AiRole.Assistant,
  seq: 0,
  type: ChatType.Tool,
  content: '',
  attributes: { tool: { name } },
})

describe('groupConsecutiveToolMessages', () => {
  it('uses standalone tools as boundaries between tool rollups', () => {
    const read = tool('read', 'read')
    const mcp = tool('mcp', 'mcp_tool_call')
    const command = tool('command', 'command_execution')
    const edit = tool('edit', 'edit')

    expect(
      groupConsecutiveToolMessages(
        [read, mcp, command, edit],
        (message) => message.attributes?.tool?.name === 'command_execution'
      )
    ).toEqual([[read, mcp], command, [edit]])
  })
})
