import { Button, Tooltip } from 'honorable'

export default {
  title: 'Tooltip',
  component: Tooltip,
}

function Template(args: any) {
  return (
    <Tooltip
      label="Yeay!"
      {...args}
    >
      <Button>
        Hover me
      </Button>
    </Tooltip>
  )
}

export const Default = Template.bind({})

Default.args = {
  arrow: false,
}
