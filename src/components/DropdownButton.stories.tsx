import { DropdownButton } from 'honorable'

export default {
  title: 'DropdownButton',
  component: DropdownButton,
}

function Template(args: any) {
  return (
    <DropdownButton {...args} />
  )
}

export const Install = Template.bind({})

Install.args = {
  install: true,
  disabled: false,
  label: 'Install',
}
