import { Button } from 'honorable'

import Tooltip from '../components/Tooltip'

export default {
  title: 'Tooltip',
  component: Tooltip,
}

function Template(args: any) {
  return (
    <Tooltip
      label="Yeah alright!"
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
