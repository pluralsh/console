import { Input, SearchIcon } from '@pluralsh/design-system'
import { ToolbarSearchInput } from 'components/layout/PageToolbar'
import { ComponentProps } from 'react'

// Search field for the workbench Alerts tab, full width above the List and
// Board views, and for the (small) Details list column.
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

// The search field in the workbench tab toolbar.
export function WorkbenchHeaderSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <ToolbarSearchInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}
