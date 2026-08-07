import { Flex } from 'honorable'

import LoopingLogo, { type LoopingLogoProps } from '../components/LoopingLogo'
import type { StoryFn } from '@storybook/react'

export default {
  title: 'LoopingLogo',
  component: LoopingLogo,
}

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

export const Default: StoryFn = Template.bind({})

Default.args = {
  isDark: false,
  scale: 1,
  animated: true,
}
