import {
  type Breadcrumb,
  Callout,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import {
  SERVICE_PARAM_CLUSTER,
  SERVICE_PARAM_ID,
  getServiceComponentPath,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useComponentKindSelect } from 'components/apps/app/components/Components'
import { useServiceDeploymentComponentsQuery } from 'generated/graphql'
import { ComponentList } from 'components/apps/app/components/ComponentList'

import { useTheme } from 'styled-components'

import { isNonNullable } from 'utils/isNonNullable'

import { getServiceDetailsBreadcrumbs } from './ServiceDetails'
import { countDeprecations } from './countDeprecations'

export const getServiceComponentsBreadcrumbs = ({
  serviceId,
  clusterName,
}: Parameters<typeof getServiceDetailsBreadcrumbs>[0]) => [
  ...getServiceDetailsBreadcrumbs({ clusterName, serviceId }),
  {
    label: 'components',
    url: `${getServiceDetailsPath({
      clusterName,
      serviceId,
    })}/components`,
  },
]

export default function ServiceComponents() {
  const theme = useTheme()
  const serviceId = useParams()[SERVICE_PARAM_ID]
  const clusterName = useParams()[SERVICE_PARAM_CLUSTER]

  const breadcrumbs: Breadcrumb[] = useMemo(
    () => getServiceComponentsBreadcrumbs({ clusterName, serviceId }),
    [clusterName, serviceId]
  )

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })

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
            // TODO: Add link to review deprecations once the url scheme is known
            // buttonProps={{
            //   as: Link,
            //   to: '{{deprecations-link}}',
            //   children: 'Review deprecations',
            // }}
          >
            This service is using {deprecationCount > 1 ? '' : 'a '}deprecated
            k8s resource{deprecationCount > 1 ? 's' : ''}.{' '}
            {deprecationCount > 1 ? 'These are' : 'This is'} incompatible with
            the k8s cluster version you are using.
          </Callout>
        )}
        <ComponentList
          setUrl={(c) => {
            const params = new URLSearchParams()

            return c?.name && c?.kind
              ? `${getServiceComponentPath({
                  clusterName,
                  serviceId,
                  componentKind: c.kind.toLocaleLowerCase(),
                  componentName: c.name.toLowerCase(),
                  componentVersion: c.version,
                })}?${params.toString()}`
              : undefined
          }}
          components={components}
          selectedKinds={selectedKinds}
        />
      </div>
    </ScrollablePage>
  )
}
