import { A, Flex } from 'honorable'

export default {
  title: 'A',
  component: A,
}

function Template(args: any) {
  return (
    <Flex gap="medium">
      <A {...args} />
      <A
        href="https://github.com"
        {...args}
      >
        Github
      </A>
      <A
        inline
        {...args}
      >
        Inline
      </A>
    </Flex>
  )
}

export const Primary = Template.bind({})

Primary.args = {
  children: 'Click me',
}
