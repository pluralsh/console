import {
  type Breadcrumb,
  Callout,
  EmptyState,
  Modal,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ComponentProps, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import isEmpty from 'lodash/isEmpty'
import { useTheme } from 'styled-components'

import {
  ServiceDeploymentComponentFragment,
  ServiceDeploymentDetailsFragment,
  useServiceDeploymentComponentsQuery,
} from 'generated/graphql'

import {
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { isNonNullable } from 'utils/isNonNullable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useComponentKindSelect } from 'components/apps/app/components/Components'

import { ComponentList } from 'components/apps/app/components/ComponentList'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { deprecationsColumns } from 'components/cd/clusters/deprecationsColumns'

import { getServiceDetailsBreadcrumbs } from './ServiceDetails'
import { collectDeprecations, countDeprecations } from './deprecationUtils'

export const getServiceComponentsBreadcrumbs = ({
  serviceId,
  serviceName,
  clusterName,
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0]) => [
  ...getServiceDetailsBreadcrumbs({ clusterName, serviceId, serviceName }),
  {
    label: 'components',
    url: `${getServiceDetailsPath({
      clusterName,
      serviceId,
    })}/components`,
  },
]

function DeprecationsModal({
  components,
  ...props
}: {
  components: ServiceDeploymentComponentFragment[]
} & ComponentProps<typeof Modal>) {
  const deprecations =
    useMemo(() => collectDeprecations(components), [components]) || []

  return (
    <Modal
      header="Deprecated Resources"
      size="large"
      maxWidth={1024}
      portal
      {...props}
    >
      {isEmpty(deprecations) ? (
        <EmptyState message="No deprecated resources" />
      ) : (
        <Table
          data={deprecations || []}
          columns={deprecationsColumns}
          css={{
            maxHeight: 500,
            height: '100%',
          }}
        />
      )}
    </Modal>
  )
}

export default function ServiceComponents() {
  const theme = useTheme()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER]
  const [showDeprecations, setShowDeprecations] = useState(false)
  const outletContext = useOutletContext<{
    service: ServiceDeploymentDetailsFragment | null | undefined
  }>()

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })
  const serviceName = outletContext?.service?.name
  const breadcrumbs: Breadcrumb[] = useMemo(
    () =>
      getServiceComponentsBreadcrumbs({ clusterName, serviceId, serviceName }),
    [clusterName, serviceId, serviceName]
  )

  useSetBreadcrumbs(breadcrumbs)
  const { kindSelector, selectedKinds } = useComponentKindSelect(
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
      headingContent={kindSelector}
    >
      <ModalMountTransition open>
        <DeprecationsModal
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
                  clusterName,
                  serviceId,
                  componentId: c.id,
                })}`
              : undefined
          }
          components={components}
          selectedKinds={selectedKinds}
        />
      </div>
    </ScrollablePage>
  )
}
