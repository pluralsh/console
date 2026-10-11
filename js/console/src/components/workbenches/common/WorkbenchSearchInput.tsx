import { Input, SearchIcon } from '@pluralsh/design-system'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'
import { ComponentProps } from 'react'

const HEADER_SEARCH_WIDTH = 360

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

// A search icon button in the tab header that expands into the search field.
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
    <IconExpander
      tooltip={placeholder}
      icon={<SearchIcon />}
      active={!!value}
      startOpen={!!value}
      onClear={() => onChange('')}
    >
      <ExpandedInput
        width={HEADER_SEARCH_WIDTH}
        inputValue={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </IconExpander>
  )
}
