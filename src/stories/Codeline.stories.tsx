import { Flex } from 'honorable'

import { Codeline } from '..'

export default {
  title: 'Codeline',
  component: Codeline,
}

function Template(args: any) {
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <Codeline {...args} />
      <Codeline
        displayText="••••••••••"
        {...args}
      />
      <Codeline
        {...args}
        maxWidth="200px"
      />
    </Flex>
  )
}

export const Default = Template.bind({})

Default.args = {
  children: 'npm i @pluralsh/design-system',
}
