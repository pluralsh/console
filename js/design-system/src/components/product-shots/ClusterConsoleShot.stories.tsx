import type { Meta, StoryObj } from '@storybook/react-vite'

import { ClusterConsoleShot } from '.'

const meta: Meta<typeof ClusterConsoleShot> = {
  title: 'Product Shots/Cluster console',
  component: ClusterConsoleShot,
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
type Story = StoryObj<typeof ClusterConsoleShot>

export const Dark: Story = {
  args: { theme: 'dark', width: 1167 },
}

export const Light: Story = {
  args: { theme: 'light', width: 1167 },
}
