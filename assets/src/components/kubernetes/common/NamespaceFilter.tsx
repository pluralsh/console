import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { ComboBox, ListBoxItem } from '@pluralsh/design-system'

import { NamespaceListFooter } from '../../cluster/pods/Pods'

export function NamespaceFilter({
  namespaces,
  namespace,
  onChange,
}: {
  namespaces: string[]
  namespace: string
  onChange: (arg: any) => any
}) {
  const [value, setValue] = useState('')

  useEffect(() => setValue(namespace), [namespace])

  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, { threshold: 0.25 })

    return value ? fuse.search(value).map(({ item }) => item) : namespaces
  }, [namespaces, value])

  return (
    <ComboBox
      inputProps={{ placeholder: 'Filter by namespace' }}
      inputValue={value}
      onInputChange={setValue}
      selectedKey={namespace}
      onSelectionChange={(key) => {
        onChange(key)
        setValue(key as string)
      }}
      dropdownFooterFixed={
        <NamespaceListFooter
          onClick={() => {
            setValue('')
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
