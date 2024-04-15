import { Dispatch, SetStateAction } from 'react'
import { Input, SearchIcon } from '@pluralsh/design-system'

export function NameFilter({
  value,
  onChange,
}: {
  value: string
  onChange: Dispatch<SetStateAction<string>>
}) {
  return (
    <Input
      height="fit-content"
      startIcon={<SearchIcon />}
      placeholder="Filter by name"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      width={300}
    />
  )
}
