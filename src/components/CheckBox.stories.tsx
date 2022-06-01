import Checkbox from './Checkbox'

export default {
  title: 'Checkbox',
  component: Checkbox,
}

function Template(args: any) {
  return (
    <>
      <Checkbox {...args}>
        Implement design system
      </Checkbox>
      <Checkbox
        defaultChecked
        {...args}
      >
        Party hard
      </Checkbox>
    </>
  )
}

export const Default = Template.bind({})
Default.args = {
}

export const Small = Template.bind({})
Small.args = {
  small: true,
}
