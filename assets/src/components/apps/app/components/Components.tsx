import {
  ComponentsIcon,
  ListBoxFooter,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { ReactElement, useEffect, useMemo, useState } from 'react'

import styled, { useTheme } from 'styled-components'

import { ComponentIcon } from './misc'

const FilterFooterInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

function FilterFooter({ allSelected = true, ...props }) {
  const theme = useTheme()

  return (
    <FilterFooterInner
      leftContent={
        <ComponentsIcon
          size={16}
          color={theme.colors['text-primary-accent'] as string}
        />
      }
      {...props}
    >
      {allSelected ? 'Clear all' : 'Select all'}
    </FilterFooterInner>
  )
}

const FilterTrigger = styled(SelectButton)<{ $width?: number }>(
  ({ $width }) => ({
    width: $width || 220,
    '&, *': {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      flexShrink: 1,
    },
  })
)

const KIND_ORDER = [
  'service',
  'deployment',
  'statefulset',
  'daemonset',
  'ingress',
  'cronjob',
  'job',
  'certificate',
  'secret',
  'configmap',
] as const satisfies string[]

const getKindIdx = (kind: Nullable<string>) => {
  const i = KIND_ORDER.findIndex((k) => k === kind?.toLowerCase())

  return i === -1 ? Number.MAX_VALUE : i
}

export function compareComponentKinds(
  k1: Nullable<string>,
  k2: Nullable<string>
) {
  if (k1 === k2) return 0

  const k1Idx = getKindIdx(k1)
  const k2Idx = getKindIdx(k2)

  if (k1Idx === k2Idx) return (k1 || '')?.localeCompare(k2 || '')

  return k1Idx - k2Idx
}

export function compareComponents<
  T extends { kind?: Nullable<string>; name?: Nullable<string> },
>({ kind: k1, name: n1 }: T, { kind: k2, name: n2 }: T) {
  const kindCompare = compareComponentKinds(k1, k2)

  if (kindCompare !== 0) {
    return kindCompare
  }

  return (n1 || '')?.localeCompare(n2 || '')
}

export function useComponentKindSelect(
  components:
    | ({ kind: string | null | undefined } | null | undefined)[]
    | null
    | undefined,
  config?: { width?: number }
): {
  selectedKinds: Set<string>
  kindSelector: ReactElement
} {
  const kinds = useMemo(() => getUniqueKinds(components || []), [components])
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(
    new Set<string>(kinds)
  )

  useEffect(() => {
    setSelectedKinds(new Set(kinds))
  }, [kinds])

  return useMemo(
    () => ({
      selectedKinds,
      kindSelector: (
        <ComponentKindSelect
          {...config}
          {...{
            selectedKinds,
            setSelectedKinds,
            kinds,
          }}
        />
      ),
    }),
    [config, kinds, selectedKinds]
  )
}

function getUniqueKinds(
  components: ({ kind: string | null | undefined } | null | undefined)[]
) {
  return Array.from(
    (components || []).reduce((kinds, component) => {
      if (component?.kind) {
        kinds.add(component.kind)
      }

      return kinds
    }, new Set<string>([])) || []
  ).sort(compareComponentKinds)
}

function ComponentKindSelect({
  selectedKinds,
  setSelectedKinds,
  kinds,
  width,
}: {
  selectedKinds: Set<string>
  setSelectedKinds: (kinds: Set<string>) => void
  kinds: string[]
  width?: number
}) {
  const sortedSelectedKinds = Array.from(selectedKinds).sort()
  const allSelected = sortedSelectedKinds.length >= kinds.length

  return (
    <Select
      label="All components"
      triggerButton={
        <FilterTrigger $width={width}>
          {allSelected
            ? 'All components'
            : sortedSelectedKinds.length === 0
            ? 'Select types'
            : sortedSelectedKinds.join(', ')}
        </FilterTrigger>
      }
      selectionMode="multiple"
      selectedKeys={selectedKinds}
      onSelectionChange={(keys) => {
        setSelectedKinds(keys as Set<string>)
      }}
      placement="right"
      dropdownFooterFixed={
        <FilterFooter
          allSelected={allSelected}
          onClick={() =>
            setSelectedKinds(new Set(allSelected ? undefined : kinds))
          }
        />
      }
      maxHeight={300}
    >
      {kinds.map((kind) => (
        <ListBoxItem
          key={kind}
          leftContent={<ComponentIcon kind={kind} />}
          label={kind}
        />
      ))}
    </Select>
  )
}
