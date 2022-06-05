import Token from '../components/Token'

export default {
  title: 'Token',
  component: Token,
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
}
