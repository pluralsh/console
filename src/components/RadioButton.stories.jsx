import { useState } from 'react'

import RadioButton from './RadioButton'

export default {
  title: 'RadioButton',
  component: RadioButton,
  argTypes: {
    backgroundColor: { control: 'color' },
  },
}

function Template(args) {
  const [value, setValue] = useState(0)

  return (
    <div>
      <RadioButton
        {...args}
        checked={value === 0}
        onChange={event => event.target.checked && setValue(0)}
        label="Pizza"
        name="Pizza"
      />
      <div style={{ marginTop: '0.5rem' }}>
        <RadioButton
          {...args}
          checked={value === 1}
          onChange={event => event.target.checked && setValue(1)}
          label="Couscous"
          name="Couscous"
        />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <RadioButton
          {...args}
          checked={value === 2}
          onChange={event => event.target.checked && setValue(2)}
          label="Dim Sum"
          name="Dim Sum"
        />
      </div>
    </div>
  )
}

export const Default = Template.bind({})

Default.args = {
}
