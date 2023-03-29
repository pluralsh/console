import {
  ComponentsIcon,
  EmptyState,
  ListBoxFooter,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { Key, useContext, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import styled, { useTheme } from 'styled-components'
import { Component as ComponentT } from 'generated/graphql'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { Div } from 'honorable'

import Component from './Component'

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

function orderBy({ kind: k1, name: n1 }, { kind: k2, name: n2 }) {
  if (k1 === k2) return n1 > n2 ? 1 : n1 === n2 ? 0 : -1

  return kindInd(k1) - kindInd(k2)
}

export default function Components() {
  const { appName } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find((app) => app.name === appName)

  useEffect(
    () =>
      setBreadcrumbs([
        { text: 'apps', url: '/' },
        { text: appName, url: `/apps/${appName}` },
        { text: 'components', url: `/apps/${appName}/components` },
      ]),
    [appName, setBreadcrumbs]
  )

  const componentKinds = Array.from(
    (currentApp?.status?.components as ComponentT[])?.reduce(
      (kinds, component) => {
        kinds.add(component.kind)

        return kinds
      },
      new Set<string>([])
    )
  ).sort()
  const [selectedKinds, setSelectedKinds] = useState<Set<Key>>(
    new Set(componentKinds)
  )
  const filteredComponents = useMemo(
    () =>
      currentApp?.status?.components
        .filter((comp) => selectedKinds.has(comp.kind))
        .sort(orderBy),
    [currentApp, selectedKinds]
  )
  const sortedSelectedKinds = Array.from(selectedKinds).sort()
  const allSelected = sortedSelectedKinds.length >= componentKinds.length

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={
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
            setSelectedKinds(keys)
          }}
          placement="right"
          dropdownFooterFixed={
            <FilterFooter
              allSelected={allSelected}
              onClick={() =>
                setSelectedKinds(
                  new Set(allSelected ? undefined : componentKinds)
                )
              }
            />
          }
          maxHeight={300}
        >
          {componentKinds.map((kind) => (
            <ListBoxItem
              key={kind}
              leftContent={<ComponentIcon kind={kind} />}
              label={kind}
            />
          ))}
        </Select>
      }
    >
      {(filteredComponents || []).length === 0 ? (
        <EmptyState message="No components match your selection" />
      ) : (
        <Div
          display="grid"
          gap="xsmall"
          gridTemplateColumns="1fr 1fr"
        >
          {filteredComponents?.map((component, i) => (
            <Component
              key={i}
              component={component}
            />
          ))}
        </Div>
      )}
    </ScrollablePage>
  )
}
