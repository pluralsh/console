import Token from '../components/Token'

export default {
  title: 'Token',
  component: Token,
  argTypes: {
    hue: {
      options: ['default', 'lighter', 'lightest'],
      control: {
        type: 'select',
      },
    },
  },
}

function Template(args: any) {
  return (
    <Token
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  children: 'jane.smith@plural.sh',
  hue: 'default',
}
