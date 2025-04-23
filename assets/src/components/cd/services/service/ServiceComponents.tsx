import {
  ArrowScroll,
  Callout,
  ComponentsIcon,
  Flex,
  SearchIcon,
  UpdatesIcon,
} from '@pluralsh/design-system'
import { type Key } from '@react-types/shared'
import {
  ComponentState,
  ServiceDeploymentComponentFragment,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'

import {
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { useThrottle } from 'components/hooks/useThrottle.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander.tsx'
import { ComponentList } from './component/ComponentList.tsx'
import {
  ComponentStateFilter,
  useComponentKindSelect,
} from './component/Components.tsx'
import { countDeprecations } from './deprecationUtils'
import { ServiceDeprecationsModal } from './ServiceDeprecationsModal'

export default function ServiceComponents() {
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterId = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const [showDeprecations, setShowDeprecations] = useState(false)
  const [selectedState, setSelectedState] = useState<Key | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const throttledSearchQuery = useThrottle(searchQuery, 250)

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })
  const { kindSelector, selectedKinds, setSelectedKinds, allKinds } =
    useComponentKindSelect(data?.serviceDeployment?.components, {
      width: 320,
    })
  const deprecationCount = useMemo(
    () => countDeprecations(data?.serviceDeployment?.components),
    [data?.serviceDeployment?.components]
  )
  const components: ServiceDeploymentComponentFragment[] = useMemo(
    () => data?.serviceDeployment?.components?.filter(isNonNullable) ?? [],
    [data?.serviceDeployment?.components]
  )

  if (error) return <GqlError error={error} />
  if (!data) return <LoadingIndicator />

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={
        <ArrowScroll>
          <FiltersWrapperSC>
            <IconExpander
              startOpen
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
          </FiltersWrapperSC>
        </ArrowScroll>
      }
    >
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
                  componentId: c.id,
                })}`
              : undefined
          }
          components={components}
          selectedKinds={selectedKinds.size > 0 ? selectedKinds : allKinds}
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
