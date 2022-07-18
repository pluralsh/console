import { useState } from 'react'
import { Button, ButtonGroup } from 'honorable'

export default {
  title: 'ButtonGroup',
  component: ButtonGroup,
}

function Template() {
  const [active, setActive] = useState(0)

  return (
    <ButtonGroup>
      <Button
        primary={active === 0}
        tertiary={active !== 0}
        onClick={() => setActive(0)}
      >
        Users
      </Button>
      <Button
        primary={active === 1}
        tertiary={active !== 1}
        onClick={() => setActive(1)}
      >
        Invites
      </Button>
    </ButtonGroup>
  )
}

export const Default = Template.bind({})

Default.args = {}
