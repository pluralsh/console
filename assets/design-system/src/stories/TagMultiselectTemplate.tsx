import { type Key, useState } from 'react'

import { TagMultiSelect } from '../components/TagMultiSelect'

export default function TagMultiSelectTemplate({
  loading,
  options,
  width,
  onSelectedTagsChange,
  onFilterChange,
  onChangeMatchType,
}: {
  loading: boolean
  options: string[]
  width: number
  onSelectedTagsChange?: (keys: Set<Key>) => void
  onFilterChange?: (value: string) => void
  onChangeMatchType?: (value: 'AND' | 'OR') => void
}) {
  const [selected, setSelected] = useState<Set<Key>>()
  const [input, setInput] = useState<string>()

  return (
    <div style={{ width: `${width}%` }}>
      <TagMultiSelect
        loading={loading}
        options={options}
        onSelectedTagsChange={onSelectedTagsChange}
        onFilterChange={onFilterChange}
        onChangeMatchType={onChangeMatchType}
        selectedTagKeys={selected}
        setSelectedTagKeys={setSelected}
        inputValue={input}
        setInputValue={setInput}
      />
    </div>
  )
}
