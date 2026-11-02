import type { Meta, StoryObj } from '@storybook/react-vite'

import { ClusterAgentShot } from '.'

const meta: Meta<typeof ClusterAgentShot> = {
  title: 'Product Shots/Cluster agent',
  component: ClusterAgentShot,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 40,
        }}
      >
        <Story />
      </div>
    ),
  ],
  argTypes: {
    theme: { control: 'select', options: ['light', 'dark'] },
  },
}

export default meta
type Story = StoryObj<typeof ClusterAgentShot>

export const Dark: Story = {
  args: { theme: 'dark', width: 480 },
}

export const Light: Story = {
  args: { theme: 'light', width: 480 },
}
