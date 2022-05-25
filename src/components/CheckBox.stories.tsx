import { Checkbox } from 'honorable'

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
        mt={0.5}
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
