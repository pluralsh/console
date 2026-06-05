import {
  ComponentsIcon,
  ListBoxFooter,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { ReactElement, useMemo, useState } from 'react'

import { type Key } from '@react-types/shared'
import styled from 'styled-components'

import {
  ComponentState,
  ServiceDeploymentComponentFragment,
} from 'generated/graphql'
import { ComponentIcon, stateToDisplay } from './misc'
import { TRUNCATE } from 'components/utils/truncate'

const FilterFooterInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

const FILTER_SELECT_WIDTH = 205

const FilterSelectSC = styled.div({
  width: FILTER_SELECT_WIDTH,
  flexShrink: 0,
  minWidth: 0,
  overflow: 'hidden',
})

export function FilterFooter({ allSelected = true, ...props }) {
  return (
    <FilterFooterInner
      leftContent={<ComponentsIcon />}
      {...props}
    >
      {allSelected ? 'Clear all' : 'Select all'}
    </FilterFooterInner>
  )
}

export const FilterTrigger = styled(SelectButton)<{
  $width?: number | string
  $border?: boolean
}>(({ $width, $border = false }) => ({
  width: $width ?? '100%',
  minWidth: 0,
  border: $border ? undefined : 'none',
  height: '100%',
  '.content': {
    minWidth: 0,
  },
  '.children': {
    ...TRUNCATE,
    minWidth: 0,
  },
}))

const KIND_ORDER = [
  'deployment',
  'statefulset',
  'daemonset',
  'ingress',
  'cronjob',
  'job',
  'service',
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

type ComponentKindSelectArray = Pick<
  ServiceDeploymentComponentFragment,
  'kind'
>[]

export function useComponentKindSelect(
  components: Nullable<ComponentKindSelectArray>,
  config?: { width?: number }
): {
  selectedKinds: Set<string>
  setSelectedKinds: (kinds: Set<string>) => void
  kindSelector: ReactElement<any>
} {
  const kinds = useMemo(() => getUniqueKinds(components || []), [components])
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(
    new Set<string>()
  )

  return useMemo(
    () => ({
      selectedKinds,
      setSelectedKinds,
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

function getUniqueKinds(components: Nullable<ComponentKindSelectArray>) {
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
}: {
  selectedKinds: Set<string>
  setSelectedKinds: (kinds: Set<string>) => void
  kinds: string[]
}) {
  const sortedSelectedKinds = Array.from(selectedKinds).sort()
  const typeTriggerLabel =
    sortedSelectedKinds.length === 0 ? 'Type' : sortedSelectedKinds.join(', ')

  return (
    <FilterSelectSC>
      <Select
        selectionMode="multiple"
        selectedKeys={selectedKinds}
        onSelectionChange={(keys: Set<Key>) => {
          setSelectedKinds(keys as Set<string>)
        }}
        label="Type"
        placement="bottom-start"
        maxHeight={300}
        width={300}
        triggerButton={
          <FilterTrigger
            $border
            showArrow
            title={typeTriggerLabel}
          >
            {typeTriggerLabel}
          </FilterTrigger>
        }
        dropdownFooterFixed={
          selectedKinds.size > 0 ? (
            <FilterFooterInner onClick={() => setSelectedKinds(new Set())}>
              Clear selection
            </FilterFooterInner>
          ) : undefined
        }
      >
        {kinds.map((kind) => (
          <ListBoxItem
            key={kind}
            leftContent={<ComponentIcon kind={kind} />}
            label={kind}
          />
        ))}
      </Select>
    </FilterSelectSC>
  )
}

export function ComponentStateFilter({
  selectedState,
  setSelectedState,
}: {
  selectedState: Key | null
  setSelectedState: (state: Key | null) => void
}) {
  const stateTriggerLabel = selectedState
    ? stateToDisplay[selectedState as ComponentState]
    : 'State'

  return (
    <FilterSelectSC>
      <Select
        selectionMode="single"
        selectedKey={selectedState}
        onSelectionChange={setSelectedState}
        placement="bottom-start"
        label="State"
        width={FILTER_SELECT_WIDTH}
        triggerButton={
          <FilterTrigger
            $border
            showArrow
            title={stateTriggerLabel}
          >
            {stateTriggerLabel}
          </FilterTrigger>
        }
        dropdownFooterFixed={
          selectedState ? (
            <FilterFooterInner onClick={() => setSelectedState(null)}>
              Clear selection
            </FilterFooterInner>
          ) : undefined
        }
      >
        {Object.values(ComponentState).map((state) => (
          <ListBoxItem
            key={state}
            label={stateToDisplay[state]}
          />
        ))}
      </Select>
    </FilterSelectSC>
  )
}
