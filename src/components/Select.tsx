import { ReactNode } from 'react'
import { Select as GrommetSelect, SelectExtendedProps } from 'grommet'

import MenuItem from './MenuItem'

type SelectProps = SelectExtendedProps & {
  items: Array<{ label: ReactNode, value: any }>
}

function Select({ items, ...props }: SelectProps) {
  return (
    <GrommetSelect
      {...props}
      onChange={({ option }) => props.onChange(option.value)}
      options={items}
    >
      {option => (
        <MenuItem key={option.value}>
          {option.label}
        </MenuItem>
      )}
    </GrommetSelect>
  )
}
export default Select
