import Button from './Button'

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'Button',
  component: Button,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    backgroundColor: { control: 'color' },
  },
}

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
function Template(args) {
  return (
    <div>
      <div>
        <Button {...args} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <Button
          disabled
          {...args}
        />
      </div>
    </div>
  )
}

export const Primary = Template.bind({})
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Primary.args = {
  primary: true,
  label: 'Click me',
}

export const Secondary = Template.bind({})
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Secondary.args = {
  secondary: true,
  label: 'Click me',
}

export const PrimarySmall = Template.bind({})
// More on args: https://storybook.js.org/docs/react/writing-stories/args
PrimarySmall.args = {
  primary: true,
  label: 'Click me',
  size: 'small',
}

export const SecondarySmall = Template.bind({})
// More on args: https://storybook.js.org/docs/react/writing-stories/args
SecondarySmall.args = {
  secondary: true,
  label: 'Click me',
  size: 'small',
}

// export const Realistic = Template.bind({})
// // More on args: https://storybook.js.org/docs/react/writing-stories/args
// Realistic.args = {
//   primary: true,
//   label: 'Continue',
//   size: 'small',
// }
