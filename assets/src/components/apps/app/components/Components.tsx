import {
  Card,
  ComponentsIcon,
  EmptyState,
  ListBoxFooter,
  ListBoxItem,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import {
  Key,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { InstallationContext } from 'components/Installations'

import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'

import styled, { useTheme } from 'styled-components'
import { Component as ComponentT } from 'generated/graphql'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import Component from './Component'

import { ComponentIcon } from './misc'

const FooterSelectAllInner = styled(ListBoxFooter)(({ theme }) => ({
  color: theme.colors['text-primary-accent'],
}))

function FooterSelectAll({ ...props }) {
  const theme = useTheme()

  return (
    <FooterSelectAllInner
      leftContent={(
        <ComponentsIcon
          size={16}
          color={theme.colors['text-primary-accent'] as string}
        />
      )}
      {...props}
    >
      Select all
    </FooterSelectAllInner>
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

export default function Components() {
  const { appName } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)
  const { applications } = useContext<any>(InstallationContext)
  const currentApp = applications.find(app => app.name === appName)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'components', url: `/apps/${appName}/components` },
  ]),
  [appName, setBreadcrumbs])

  const componentKinds = Array.from((currentApp?.status?.components as ComponentT[])?.reduce((kinds, component) => {
    kinds.add(component.kind)

    return kinds
  },
  new Set<string>([]))).sort()
  const [selectedKinds, setSelectedKinds] = useState<Set<Key>>(new Set(componentKinds))
  const filteredComponents = currentApp?.status?.components.filter(comp => selectedKinds.has(comp.kind))
  const sortedSelectedKinds = Array.from(selectedKinds).sort()

  return (
    <ScrollablePage
      scrollable={false}
      heading="Components"
      headingContent={(
        <Select
          label="All components"
          triggerButton={(
            <FilterTrigger>
              {sortedSelectedKinds.length >= componentKinds.length
                ? 'All components'
                : sortedSelectedKinds.length === 0
                  ? 'Select types'
                  : sortedSelectedKinds.join(', ')}
            </FilterTrigger>
          )}
          selectionMode="multiple"
          selectedKeys={selectedKinds}
          onSelectionChange={keys => {
            setSelectedKinds(keys)
          }}
          placement="right"
          dropdownFooterFixed={(
            <FooterSelectAll
              onClick={() => setSelectedKinds(new Set(componentKinds))}
            />
          )}
          maxHeight={300}
        >
          {componentKinds.map(kind => (
            <ListBoxItem
              key={kind}
              leftContent={<ComponentIcon kind={kind} />}
              label={kind}
            />
          ))}
        </Select>
      )}
    >
      <Card
        maxHeight="100%"
        direction="column"
        paddingRight="xxxsmall"
        overflowY="auto"
      >
        {(filteredComponents || []).length === 0 ? (
          <EmptyState message="No components match your selection" />
        ) : (
          filteredComponents?.map((component, i) => (
            <Component
              key={i}
              component={component}
              last={currentApp.status.components.length === i + 1}
            />
          ))
        )}
      </Card>
    </ScrollablePage>
  )
}
