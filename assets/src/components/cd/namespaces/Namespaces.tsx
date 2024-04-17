import { ComponentProps, useMemo } from 'react'
import { Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { AuthMethod } from 'generated/graphql'
import { CD_REL_PATH, NAMESPACES_REL_PATH } from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import {
  ColAnnotations,
  ColLabels,
  ColLastActivity,
  ColName,
} from './NamespacesColumns'
import { NamespacesTable } from './NamespacesTable'

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

export const columns = [ColName, ColAnnotations, ColLabels, ColLastActivity]

export default function Namespaces() {
  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'namespaces',
          url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}`,
        },
      ],
      []
    )
  )

  return <NamespacesTable />
}
