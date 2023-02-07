import { ListBoxItem, Select } from '@pluralsh/design-system'
import { Div, Span } from 'honorable'
import { Key, useEffect, useState } from 'react'

export default function DashboardLabelSelect({ label, onSelect }) {
  const [selectedKey, setSelectedKey] = useState<Key>(label.values[0])

    // Run it only once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => onSelect(label.values[0]), [])

  return (
    <Div width={250}>
      <Select
        aria-label={label.name}
        leftContent={(
          <Span
            caption
            color="text-xlight"
          >
            {label.name}
          </Span>
        )}
        selectedKey={selectedKey}
        onSelectionChange={value => {
          setSelectedKey(value)
          onSelect(value)
        }}
        width={250}
      >
        {label.values.map(value => (
          <ListBoxItem
            key={value}
            label={value}
            textValue={value}
          />
        ))}
      </Select>
    </Div>
  )
}
