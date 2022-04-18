import Tag from './Tag'

export default {
  title: 'Tag',
  component: Tag,
}

function Template(args: any) {
  return (
    <Tag
      {...args}
    />
  )
}

export const Default = Template.bind({})

Default.args = {
  children: 'I am a tag',
}
