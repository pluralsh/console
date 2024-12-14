import { ListBoxItem, NamespaceIcon, Select } from '@pluralsh/design-system'
import {
  FilterFooter,
  FilterTrigger,
} from 'components/cd/services/service/component/Components'

export function NamespaceMultiSelect({
  allNamespaces,
  selectedNamespaces,
  setSelectedNamespaces,
}: {
  allNamespaces: string[]
  selectedNamespaces: string[]
  setSelectedNamespaces: (selectedNamespaces: string[]) => void
}) {
  const allSelected =
    Array.from(selectedNamespaces).length >= allNamespaces.length
  const sortedSelectedNamespaces = Array.from(selectedNamespaces).sort()

  return (
    <Select
      label="All namespaces"
      triggerButton={
        <FilterTrigger $width={280}>
          {sortedSelectedNamespaces.length === 0
            ? 'Select namespaces'
            : allSelected
              ? 'All namespaces'
              : sortedSelectedNamespaces.join(', ')}
        </FilterTrigger>
      }
      selectionMode="multiple"
      selectedKeys={selectedNamespaces}
      onSelectionChange={(keys) => {
        setSelectedNamespaces(Array.from(keys) as string[])
      }}
      placement="right"
      dropdownFooterFixed={
        <FilterFooter
          allSelected={allSelected}
          onClick={() =>
            setSelectedNamespaces(allSelected ? [] : allNamespaces)
          }
        />
      }
    >
      {allNamespaces.map((namespace) => (
        <ListBoxItem
          key={namespace}
          leftContent={<NamespaceIcon />}
          label={namespace}
        />
      ))}
    </Select>
  )
}
