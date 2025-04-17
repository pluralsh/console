import { ComponentProps, useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { ComboBox, ListBoxItem } from '@pluralsh/design-system'

import { useTheme } from 'styled-components'
import { NamespaceListFooter } from '../../utils/NamespaceListFooter.tsx'

export function NamespaceFilter({
  namespaces,
  namespace,
  onChange,
  ...props
}: {
  namespaces: string[]
  namespace?: string
  onChange: (arg: any) => any
} & Partial<ComponentProps<typeof ComboBox>>) {
  const theme = useTheme()
  const [value, setValue] = useState<string | undefined>(namespace)

  useEffect(() => setValue(namespace), [namespace])

  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, { threshold: 0.25 })

    return value ? fuse.search(value).map(({ item }) => item) : namespaces
  }, [namespaces, value])

  return (
    <ComboBox
      startIcon={null}
      showArrow={false}
      inputProps={{
        placeholder: 'Filter by namespace',
        style: {
          border: 'none',
          borderRadius: 0,
          background: theme.colors['fill-two'],
        },
      }}
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
      {...props}
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
