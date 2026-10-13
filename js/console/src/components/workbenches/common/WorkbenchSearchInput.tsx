import { Input, SearchIcon } from '@pluralsh/design-system'
import { ComponentProps } from 'react'

// Search field for the workbench Jobs, Issues and Alerts tabs: full width
// above the List and Board views, small in the Details list column.
export function WorkbenchSearchInput({
  value,
  onChange,
  placeholder,
  size,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  size?: ComponentProps<typeof Input>['size']
}) {
  return (
    <Input
      size={size}
      showClearButton
      startIcon={<SearchIcon />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      css={{ flexShrink: 0 }}
    />
  )
}
