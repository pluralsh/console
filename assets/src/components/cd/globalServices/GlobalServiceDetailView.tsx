import { ComponentProps, useMemo } from 'react'
import { Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { AuthMethod } from 'generated/graphql'
import {
  CD_REL_PATH,
  GLOBAL_SERVICES_REL_PATH,
  GLOBAL_SERVICE_PARAM_ID,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useParams } from 'react-router-dom'

import { gql, useQuery } from '@apollo/client'

import { Title1H1 } from 'components/utils/typography/Text'

import { useTheme } from 'styled-components'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import {
  ColDistribution,
  ColLastActivity,
  ColServiceName,
  ColTags,
} from './GlobalServicesColumns'
import { GlobalServiceDetailTable } from './GlobalServiceDetailTable'

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export const GLOBAL_SERVICES_QUERY_PAGE_SIZE = 100

export const GLOBAL_SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const columns = [
  ColServiceName,
  ColDistribution,
  ColTags,
  ColLastActivity,
]

const getServiceNameQuery = gql`
  query GetServiceName($serviceId: ID!) {
    globalService(id: $serviceId) {
      name
    }
  }
`

export default function GlobalServiceDetailView() {
  const params = useParams()
  const theme = useTheme()

  const serviceId = params[GLOBAL_SERVICE_PARAM_ID]

  const { data } = useQuery(getServiceNameQuery, {
    variables: { serviceId },
  })

  const serviceName = data?.globalService?.name

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'global-services',
          url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
        },
        {
          label: serviceName,
          url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}/${serviceName}`,
        },
      ],
      [serviceName]
    )
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        padding: theme.spacing.large,
        height: '100%',
      }}
    >
      <Title1H1>{serviceName}</Title1H1>
      <GlobalServiceDetailTable serviceId={serviceId} />
    </div>
  )
}
