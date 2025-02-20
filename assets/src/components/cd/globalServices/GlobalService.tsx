import { useMemo, useState } from 'react'
import { Button, useSetBreadcrumbs } from '@pluralsh/design-system'

import { CD_REL_PATH, GLOBAL_SERVICES_REL_PATH } from 'routes/cdRoutesConsts'

import { useTheme } from 'styled-components'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { YamlGeneratorModal } from '../YamlGeneratorModal'

import {
  ColActions,
  ColDistribution,
  ColLastActivity,
  ColProject,
  ColServiceName,
  ColTags,
} from './GlobalServicesColumns'
import { GlobalServicesTable } from './GlobalServicesTable'

export const columns = [
  ColServiceName,
  ColDistribution,
  ColTags,
  ColProject,
  ColLastActivity,
  ColActions,
]

export const crumbs = [
  ...CD_BASE_CRUMBS,
  {
    label: 'global services',
    url: `/${CD_REL_PATH}/${GLOBAL_SERVICES_REL_PATH}`,
  },
]

export default function GlobalServices() {
  const theme = useTheme()
  const [refetch, setRefetch] = useState(() => () => {})
  const [isModalOpen, setIsModalOpen] = useState(false)

  useSetBreadcrumbs(crumbs)

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
          <YamlGeneratorModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            refetch={refetch}
            header="Create global service"
            kind="GlobalService"
          />
        </div>
      ),
      [theme.spacing.small, isModalOpen, refetch]
    )
  )

  return <GlobalServicesTable setRefetch={setRefetch} />
}
