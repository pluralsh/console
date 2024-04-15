import { ComponentProps, useMemo, useState } from 'react'
import { Button, Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { AuthMethod } from 'generated/graphql'
import { CD_REL_PATH, NAMESPACES_REL_PATH } from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useTheme } from 'styled-components'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { YamlGeneratorModal } from '../YamlGeneratorModal'

import {
  ColCreatedAt,
  ColFinalizers,
  ColName,
  ColNamespace,
  ColStatus,
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

export const columns = [
  ColName,
  ColNamespace,
  ColStatus,
  ColFinalizers,
  ColCreatedAt,
]

export default function Namespaces() {
  const theme = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  useSetPageHeaderContent(
    useMemo(
      () => (
        <div
          css={{
            display: 'flex',
            justifyContent: 'end',
            gap: theme.spacing.small,
          }}
        >
          <Button onClick={() => setIsModalOpen(true)}>New namespace</Button>
          <YamlGeneratorModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            header="Create global service"
            kind="GlobalService"
          />
        </div>
      ),
      [theme.spacing.small, isModalOpen]
    )
  )

  return <NamespacesTable />
}
