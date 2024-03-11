import { ComboBox, ListBoxItem } from '@pluralsh/design-system'

import { useMemo, useState } from 'react'

import Fuse from 'fuse.js'

import { NamespaceListFooter } from '../cluster/pods/Pods'

export function NamespaceSelect({
  namespaces,
  namespace,
  onChange,
}: {
  namespaces: string[]
  namespace: string
  onChange: (arg: any) => any
}) {
  const [inputValue, setInputValue] = useState(namespace)

  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, { threshold: 0.25 })

    return inputValue
      ? fuse.search(inputValue).map(({ item }) => item)
      : namespaces
  }, [namespaces, inputValue])

  return (
    <ComboBox
      inputProps={{ placeholder: 'Filter by namespace' }}
      inputValue={inputValue}
      onInputChange={setInputValue}
      selectedKey={namespace}
      onSelectionChange={(key) => {
        onChange(key)
        setInputValue(key as string)
      }}
      dropdownFooterFixed={
        <NamespaceListFooter
          onClick={() => {
            setInputValue('')
            onChange('')
          }}
        />
      }
      aria-label="namespace"
    >
      {filteredNamespaces.map((namespace) => (
        <ListBoxItem
          key={namespace}
          textValue={namespace}
          label={namespace}
        />
      ))}
    </ComboBox>
  )
}
