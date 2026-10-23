import {
  ComponentProps,
  Dispatch,
  KeyboardEvent,
  SetStateAction,
  useCallback,
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

import { NamespaceListFooter } from '../../utils/NamespaceListFooter.tsx'

export function NamespaceFilter({
  namespaces,
  namespace,
  onChange,
  inputProps,
  ...props
}: {
  namespaces: string[]
  namespace?: string
  onChange: Dispatch<SetStateAction<string | undefined>>
} & Partial<Omit<ComponentProps<typeof ComboBox>, 'onChange'>>) {
  // typed text and the namespace it was typed against; a new namespace replaces it
  const [draft, setDraft] = useState<{
    namespace?: string
    value?: string
  }>({ namespace, value: namespace })
  const value = draft.namespace === namespace ? draft.value : namespace
  const setValue = (value: string | undefined) => setDraft({ namespace, value })

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
      setDraft({ namespace: ns, value: ns })
    },
    [onChange]
  )

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter' || !trimmedValue || !isCustomNamespace) return

      event.preventDefault()
      applyNamespace(trimmedValue)
    },
    [applyNamespace, trimmedValue, isCustomNamespace]
  )

  return (
    <ComboBox
      startIcon={null}
      showArrow={false}
      allowsEmptyCollection={isCustomNamespace}
      inputProps={{
        placeholder: 'Filter by namespace',
        onKeyDown: handleEnter,
        ...inputProps,
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
