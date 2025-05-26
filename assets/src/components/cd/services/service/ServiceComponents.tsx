import {
  ArrowScroll,
  Callout,
  ComponentsIcon,
  FillLevelProvider,
  Flex,
  ListIcon,
  NetworkInterfaceIcon,
  SearchIcon,
  UpdatesIcon,
} from '@pluralsh/design-system'
import { type Key } from '@react-types/shared'

import { useThrottle } from 'components/hooks/useThrottle.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander.tsx'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import {
  ComponentState,
  ServiceDeploymentComponentFragment,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { getServiceComponentPath } from 'routes/cdRoutesConsts'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import ButtonGroup from '../../../utils/ButtonGroup.tsx'
import { ComponentList } from './component/ComponentList.tsx'
import {
  ComponentStateFilter,
  useComponentKindSelect,
} from './component/Components.tsx'
import { countDeprecations } from './deprecationUtils'
import { ComponentsTreeView } from './ServiceComponentsTree.tsx'
import { ServiceDeprecationsModal } from './ServiceDeprecationsModal'

const directory = [
  { path: 'list', icon: <ListIcon />, tooltip: 'List view' },
  { path: 'tree', icon: <NetworkInterfaceIcon />, tooltip: 'Tree view' },
]

const defaultView = 'list'

export function ServiceComponents() {
  const [selectedState, setSelectedState] = useState<Key | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [components, setComponents] = useState<
    ServiceDeploymentComponentFragment[]
  >([])

  const view = useMemo(
    () => searchParams.get('view') || defaultView,
    [searchParams]
  )

  const { kindSelector, selectedKinds, setSelectedKinds } =
    useComponentKindSelect(components, {
      width: 320,
    })

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={
        <ArrowScroll>
          <FiltersWrapperSC>
            <IconExpander
              tooltip="Search components"
              icon={<SearchIcon />}
              active={!!searchQuery}
              onClear={() => setSearchQuery('')}
            >
              <ExpandedInput
                width={320}
                inputValue={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search components"
              />
            </IconExpander>
            <IconExpander
              tooltip="Filter by component kind"
              icon={<ComponentsIcon />}
              active={!!selectedKinds.size}
              onClear={() => setSelectedKinds(new Set())}
            >
              {kindSelector}
            </IconExpander>
            <IconExpander
              tooltip="Filter by component state"
              icon={<UpdatesIcon />}
              active={!!selectedState}
              onClear={() => setSelectedState(null)}
            >
              <ComponentStateFilter
                selectedState={selectedState}
                setSelectedState={setSelectedState}
              />
            </IconExpander>
            <ComponentsViewSwitch
              tab={view}
              setTab={(view: string) => setSearchParams({ view })}
            />
          </FiltersWrapperSC>
        </ArrowScroll>
      }
    >
      {view === 'list' && (
        <ComponentsListView
          setComponents={setComponents}
          selectedKinds={selectedKinds}
          selectedState={selectedState}
          searchQuery={searchQuery}
        />
      )}
      {view === 'tree' && (
        <ComponentsTreeView
          setComponents={setComponents}
          selectedKinds={selectedKinds}
          selectedState={selectedState}
          searchQuery={searchQuery}
        />
      )}
    </ScrollablePage>
  )
}

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  width: '100%',
  gap: theme.spacing.medium,
  paddingRight: theme.spacing.large,
}))

function ComponentsViewSwitch({ tab, setTab }): ReactNode {
  return (
    <FillLevelProvider value={0}>
      <ButtonGroup
        directory={directory}
        tab={tab}
        onClick={setTab}
      />
    </FillLevelProvider>
  )
}

function ComponentsListView({
  selectedKinds,
  selectedState,
  setComponents,
  searchQuery,
}: {
  selectedKinds: Set<string>
  selectedState: Key | null
  setComponents: (components: ServiceDeploymentComponentFragment[]) => void
  searchQuery: string
}) {
  const { serviceId, clusterId, flowId } = useParams()
  const throttledSearchQuery = useThrottle(searchQuery, 250)
  const [showDeprecations, setShowDeprecations] = useState(false)

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })

  const deprecationCount = useMemo(
    () => countDeprecations(data?.serviceDeployment?.components),
    [data?.serviceDeployment?.components]
  )
  const components: ServiceDeploymentComponentFragment[] = useMemo(
    () => data?.serviceDeployment?.components?.filter(isNonNullable) ?? [],
    [data?.serviceDeployment?.components]
  )

  useEffect(() => {
    setComponents(components)
  }, [components, setComponents])

  if (error) return <GqlError error={error} />
  if (!data) return <LoadingIndicator />

  return (
    <>
      <Flex
        direction="column"
        gap="medium"
        overflow="hidden"
      >
        {deprecationCount > 0 && (
          <Callout
            severity="danger"
            title={`Using ${
              deprecationCount > 1 ? '' : 'an '
            } outdated k8s version${deprecationCount > 1 ? 's' : ''}`}
            buttonProps={{
              onClick: () => setShowDeprecations(true),
              children: 'Review deprecations',
            }}
          >
            This service is using {deprecationCount > 1 ? '' : 'a '}deprecated
            k8s resource{deprecationCount > 1 ? 's' : ''}.{' '}
            {deprecationCount > 1 ? 'These are' : 'This is'} incompatible with
            the k8s cluster version you are using.
          </Callout>
        )}
        <ComponentList
          setUrl={(c) =>
            c?.name && c?.kind
              ? `${getServiceComponentPath({
                  clusterId,
                  serviceId,
                  flowId,
                  componentId: c.id,
                })}`
              : undefined
          }
          components={components}
          selectedKinds={selectedKinds}
          selectedState={selectedState as ComponentState | null}
          searchQuery={throttledSearchQuery}
        />
      </Flex>
      <ModalMountTransition open={showDeprecations}>
        <ServiceDeprecationsModal
          open={showDeprecations}
          onClose={() => setShowDeprecations(false)}
          components={components}
        />
      </ModalMountTransition>
    </>
  )
}
