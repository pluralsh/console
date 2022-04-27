import { useState } from 'react'
import { Checkbox, Div, P } from 'honorable'

export default {
  title: 'Checkbox',
  component: Checkbox,
}

function Template(args: any) {
  const [checked, setChecked] = useState([true, true])

  return (
    <>
      <Div xflex="x4">
        <Checkbox
          {...args}
          checked={checked[0]}
          // @ts-ignore
          onChange={event => setChecked(checked => [event.target.checked, checked[1]])}
        />
        <P ml={0.5}>
          Implement design system
        </P>
      </Div>
      <Div
        xflex="x4"
        mt={0.5}
      >
        <Checkbox
          {...args}
          checked={checked[1]}
          // @ts-ignore
          onChange={event => setChecked(checked => [checked[0], event.target.checked])}
        />
        <P ml={0.5}>
          Party hard
        </P>
      </Div>
    </>
  )
}

export const Default = Template.bind({})

Default.args = {
}
