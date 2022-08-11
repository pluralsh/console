import { Flex } from 'honorable'

import LoopingLogo, { LoopingLogoProps } from '../components/LoopingLogo'

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

export const Default = Template.bind({})

Default.args = {
  isDark: false,
  scale: 1,
  animated: true,
}
