import { ListBoxItem, Select } from '@pluralsh/design-system'

export const ALL_NAMESPACES = ''

export function NamespaceSelect({
  namespaces,
  selectedKey,
  onSelectionChange,
}: {
  namespaces: string[]
  selectedKey: string
  onSelectionChange?: (arg: any) => any
}) {
  return (
    <Select
      label="Namespace"
      titleContent="Namespace"
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
    >
      <>
        {namespaces.map((namespace) => (
          <ListBoxItem
            key={namespace}
            label={namespace}
            textValue={namespace}
          />
        ))}
        <ListBoxItem
          key={ALL_NAMESPACES}
          label="All Namespaces"
          textValue="All Namespaces"
        />
      </>
    </Select>
  )
}
