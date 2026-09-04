import { Flex } from 'honorable'
import type { Meta, StoryObj } from '@storybook/react'

import { AgentLoadingIcon } from '../components/AgentLoadingIcon'

const meta = {
  title: 'AgentLoadingIcon',
  component: AgentLoadingIcon,
} satisfies Meta<typeof AgentLoadingIcon>

export default meta
type Story = StoryObj<typeof AgentLoadingIcon>

export const Default: Story = {
  render: (args) => (
    <Flex
      grow={1}
      alignItems="center"
      gap={12}
    >
      <AgentLoadingIcon {...args} />
      Waiting for subagent
    </Flex>
  ),
  args: {
    size: 16,
  },
}
