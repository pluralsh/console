import { ComponentProps, useMemo, useState } from 'react'
import { Button, Chip, Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { AuthMethod } from 'generated/graphql'
import { CD_REL_PATH, GLOBAL_SERVICES_REL_PATH } from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'

import { useTheme } from 'styled-components'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import {
  ColDistribution,
  ColLastActivity,
  ColServiceName,
  ColTags,
} from './GlobalServicesColumns'
import { GlobalServicesTable } from './GlobalServicesTable'
import { GlobalServiceYamlGeneratorModal } from './GlobalServiceYamlGeneratorModal'

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

export default function GlobalServices() {
  const theme = useTheme()
  const [isModalOpen, setIsModalOpen] = useState(false)

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'global-services',
          url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
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
          <Button onClick={() => setIsModalOpen(true)}>
            New Global Service
          </Button>
          <GlobalServiceYamlGeneratorModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
          />
        </div>
      ),
      [theme.spacing.small, isModalOpen]
    )
  )

  return <GlobalServicesTable />
}
