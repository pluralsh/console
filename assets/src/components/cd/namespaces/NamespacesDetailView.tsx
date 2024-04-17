import { ComponentProps, useMemo } from 'react'
import { Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { AuthMethod, useGetManagedNamespaceNameQuery } from 'generated/graphql'
import {
  CD_REL_PATH,
  NAMESPACES_PARAM_ID,
  NAMESPACES_REL_PATH,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useParams } from 'react-router-dom'

import { Title1H1 } from 'components/utils/typography/Text'

import { useTheme } from 'styled-components'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { NamespacesDetailTable } from './NamespacesDetailTable'

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

export const NAMESPACES_QUERY_PAGE_SIZE = 100

export const NAMESPACES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export default function NamespacesDetailView() {
  const params = useParams()
  const theme = useTheme()

  const namespaceId = params[NAMESPACES_PARAM_ID]

  const { data } = useGetManagedNamespaceNameQuery({
    variables: { namespaceId: namespaceId || '' },
  })

  const namespaceName = data?.managedNamespace?.name || ''

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'namespaces',
          url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}`,
        },
        {
          label: namespaceName,
          url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}/${namespaceName}`,
        },
      ],
      [namespaceName]
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
      <Title1H1>{namespaceName}</Title1H1>
      <NamespacesDetailTable namespaceId={namespaceId} />
    </div>
  )
}
