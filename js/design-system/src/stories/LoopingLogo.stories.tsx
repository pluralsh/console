import LoopingLogo, { type LoopingLogoProps } from '../components/LoopingLogo'
import Flex from '../components/Flex'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
  title: 'Looping Logo',
  component: LoopingLogo,
} satisfies Meta<any>

export default meta
type Story = StoryObj<any>

function Template(args: LoopingLogoProps) {
  return (
    <Flex
      grow={1}
      justify="center"
    >
      <LoopingLogo {...args} />
    </Flex>
  )
}

export const Default: Story = {
  render: Template,
  args: {
    isDark: false,
    scale: 1,
    animated: true,
  },
}
