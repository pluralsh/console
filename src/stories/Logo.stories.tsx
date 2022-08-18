import { Flex } from 'honorable'

import Logo, { LogoProps, LogoType } from '../components/Logo'

export default {
  title: 'Logo',
  component: Logo,
  argTypes: {
    type: {
      options: Object.values(LogoType),
      control: {
        type: 'select',
      },
    },
  },
}

function Template(args: LogoProps) {
  return (
    <Flex
      justify="center"
      gap="large"
      direction="column"
    >
      <div>
        <h3>Default size</h3>
        <Logo {...args} />
      </div>

      <div>
        <h3>Height: 150px</h3>
        <Logo
          height={150}
          {...args}
        />
      </div>

      <div>
        <h3>Width: 150px</h3>
        <Logo
          width={150}
          {...args}
        />
      </div>

      <div>
        <h3>Width: 150px, Height: 150px</h3>
        <Logo
          width={150}
          height={150}
          {...args}
        />
      </div>
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  isDark: false,
  type: LogoType.Full,
}
