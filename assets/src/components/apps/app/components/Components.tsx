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

const FilterTrigger = styled(SelectButton)({
  width: 220,
  '&, *': {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    flexShrink: 1,
  },
})

const ORDER = {
  deployment: 1,
  statefulset: 2,
  certificate: 3,
  ingress: 4,
  cronjob: 5,
  service: 6,
  job: 7,
}

const kindInd = (kind) => ORDER[kind.toLowerCase()] || 7

export function orderBy(
  { kind: k1, name: n1 }: any,
  { kind: k2, name: n2 }: any
) {
  if (k1 === k2) return n1 > n2 ? 1 : n1 === n2 ? 0 : -1

  return kindInd(k1) - kindInd(k2)
}

export function useComponentKindSelect(
  components:
    | ({ kind: string | null | undefined } | null | undefined)[]
    | null
    | undefined
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
          {...{
            selectedKinds,
            setSelectedKinds,
            kinds,
          }}
        />
      ),
    }),
    [kinds, selectedKinds]
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
  ).sort()
}

function ComponentKindSelect({
  selectedKinds,
  setSelectedKinds,
  kinds,
}: {
  selectedKinds: Set<string>
  setSelectedKinds: (kinds: Set<string>) => void
  kinds: string[]
}) {
  const sortedSelectedKinds = Array.from(selectedKinds).sort()
  const allSelected = sortedSelectedKinds.length >= kinds.length

  return (
    <Select
      label="All components"
      triggerButton={
        <FilterTrigger>
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
