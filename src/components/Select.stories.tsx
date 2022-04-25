import { useState } from 'react'

import Select from './Select'

export default {
  title: 'Select',
  component: Select,
}

function Template({ items, initialValue, ...props }: any) {
  const [value, setValue] = useState(initialValue || null)

  console.log('value', value)

  return (
    <Select
      {...props}
      items={items}
      value={value}
      onChange={setValue}
    />
  )
}

const items = [
  { label: 'For', value: 'For' },
  { label: 'Kubernetes', value: 'Kubernetes' },
  { label: 'Lovers', value: 'Lovers' },
]

export const Default = Template.bind({})
Default.args = {
  items,
}

export const Selected = Template.bind({})
Selected.args = {
  items,
  initialValue: 'Kubernetes',
}
