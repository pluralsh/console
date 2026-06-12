import {
  ComponentProps,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import Fuse from 'fuse.js'
import {
  AddIcon,
  ComboBox,
  ListBoxFooterPlus,
  ListBoxItem,
} from '@pluralsh/design-system'

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
  onChange: Dispatch<SetStateAction<string | undefined>>
} & Partial<ComponentProps<typeof ComboBox>>) {
  const theme = useTheme()
  const [value, setValue] = useState<string | undefined>(namespace)

  useEffect(() => {
    setValue(namespace)
  }, [namespace])

  const trimmedValue = value?.trim() ?? ''

  const filteredNamespaces = useMemo(() => {
    const fuse = new Fuse(namespaces, { threshold: 0.25 })

    return trimmedValue
      ? fuse.search(trimmedValue).map(({ item }) => item)
      : namespaces
  }, [namespaces, trimmedValue])

  const isCustomNamespace = !!trimmedValue && !namespaces.includes(trimmedValue)

  const applyNamespace = useCallback(
    (ns: string) => {
      onChange(ns)
      setValue(ns)
    },
    [onChange]
  )

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || !trimmedValue) return

      event.preventDefault()
      applyNamespace(trimmedValue)
    },
    [applyNamespace, trimmedValue]
  )

  return (
    <ComboBox
      startIcon={null}
      showArrow={false}
      allowsEmptyCollection={isCustomNamespace}
      inputProps={{
        placeholder: 'Filter by namespace',
        style: {
          border: 'none',
          borderRadius: 0,
          background: theme.colors['fill-two'],
        },
        onKeyDown: handleEnter,
      }}
      inputValue={value}
      onInputChange={setValue}
      selectedKey={namespace}
      onSelectionChange={(key) => {
        applyNamespace((key ?? '') as string)
      }}
      onFooterClick={
        isCustomNamespace ? () => applyNamespace(trimmedValue) : undefined
      }
      dropdownFooter={
        isCustomNamespace ? (
          <ListBoxFooterPlus
            leftContent={
              <AddIcon
                size={16}
                color="text-primary-accent"
              />
            }
          >
            Use &quot;{trimmedValue}&quot;
          </ListBoxFooterPlus>
        ) : undefined
      }
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
