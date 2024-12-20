import {
  type Breadcrumb,
  Callout,
  Flex,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import {
  ComponentState,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { type Key } from '@react-types/shared'

import {
  SERVICE_PARAM_CLUSTER_ID,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'

import { countDeprecations } from './deprecationUtils'
import { ServiceDeprecationsModal } from './ServiceDeprecationsModal'
import {
  getServiceDetailsBreadcrumbs,
  useServiceContext,
} from './ServiceDetails'
import { ComponentList } from './component/ComponentList.tsx'
import {
  ComponentStateFilter,
  useComponentKindSelect,
} from './component/Components.tsx'

export const getServiceComponentsBreadcrumbs = ({
  service,
  cluster,
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0]) => [
  ...getServiceDetailsBreadcrumbs({ cluster, service }),
  {
    label: 'components',
    url: `${getServiceDetailsPath({
      clusterId: cluster.id,
      serviceId: service.id,
    })}/components`,
  },
]

export default function ServiceComponents() {
  const theme = useTheme()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterId = useParams()[SERVICE_PARAM_CLUSTER_ID]
  const [showDeprecations, setShowDeprecations] = useState(false)
  const outletContext = useServiceContext()
  const [selectedState, setSelectedState] = useState<Key | null>(null)

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })
  const breadcrumbs: Breadcrumb[] = useMemo(
    () =>
      getServiceComponentsBreadcrumbs({
        cluster: outletContext?.service?.cluster as any,
        service: outletContext?.service as any,
      }),
    [outletContext.service]
  )

  useSetBreadcrumbs(breadcrumbs)
  const { kindSelector, selectedKinds, allKinds } = useComponentKindSelect(
    data?.serviceDeployment?.components,
    { width: 320 }
  )
  const deprecationCount = useMemo(
    () => countDeprecations(data?.serviceDeployment?.components),
    [data?.serviceDeployment?.components]
  )
  const components = useMemo(
    () => data?.serviceDeployment?.components?.filter(isNonNullable) || [],
    [data?.serviceDeployment?.components]
  )

  if (error) {
    return null
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={
        <Flex gap="medium">
          {kindSelector}
          <ComponentStateFilter
            selectedState={selectedState}
            setSelectedState={setSelectedState}
          />
        </Flex>
      }
    >
      <ModalMountTransition open={showDeprecations}>
        <ServiceDeprecationsModal
          open={showDeprecations}
          onClose={() => setShowDeprecations(false)}
          components={components}
        />
      </ModalMountTransition>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          rowGap: theme.spacing.large,
        }}
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
        />
      </div>
    </ScrollablePage>
  )
}
