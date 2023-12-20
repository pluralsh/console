import { ComponentProps, useMemo, useState } from 'react'
import { Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import {
  AuthMethod,
  type ServiceDeploymentsRowFragment,
} from 'generated/graphql'
import { CD_REL_PATH, SERVICES_REL_PATH } from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { CD_BASE_CRUMBS, useSetCDHeaderContent } from '../ContinuousDeployment'

import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from './ServicesColumns'
import { DeployService } from './deployModal/DeployService'
import { ServicesTable } from './ServicesTable'

export type ServicesCluster = Exclude<
  ServiceDeploymentsRowFragment['cluster'],
  undefined | null
>

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

export const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

export const SERVICES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const SERVICES_QUERY_PAGE_SIZE = 100

export default function Services() {
  const theme = useTheme()
  const [refetch, setRefetch] = useState(() => () => {})

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'services',
          url: `/${CD_REL_PATH}/${SERVICES_REL_PATH}`,
        },
      ],
      []
    )
  )

  useSetCDHeaderContent(
    useMemo(
      () => (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.small,
          }}
        >
          <DeployService refetch={refetch} />
        </div>
      ),
      [refetch, theme.spacing.small]
    )
  )

  return <ServicesTable setRefetch={setRefetch} />
}
