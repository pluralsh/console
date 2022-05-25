import Radio from './Radio'

export default {
  title: 'Radio',
  component: Radio,
}

function Template(args: any) {
  return (
    <>
      <Radio {...args}>
        Implement design system
      </Radio>
      <Radio
        mt={0.5}
        defaultChecked
        {...args}
      >
        Party hard
      </Radio>
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
