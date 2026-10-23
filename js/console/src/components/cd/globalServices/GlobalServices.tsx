import { useMemo, useState } from 'react'
import { Button, useSetBreadcrumbs } from '@pluralsh/design-system'

import { CD_REL_PATH, GLOBAL_SERVICES_REL_PATH } from 'routes/cdRoutesConsts'

import { ToolbarSearchInput } from 'components/layout/PageToolbar'

import {
  CD_BASE_CRUMBS,
  useSetPageHeaderContent,
} from '../ContinuousDeployment'

import { YamlGeneratorModal } from '../YamlGeneratorModal'

import {
  ColActions,
  ColDistribution,
  ColLastActivity,
  ColMgmt,
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
  ColMgmt,
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

export function GlobalServices() {
  const [searchString, setSearchString] = useState('')
  const [refetch, setRefetch] = useState(() => () => {})
  const [isModalOpen, setIsModalOpen] = useState(false)

  useSetBreadcrumbs(crumbs)

  useSetPageHeaderContent(
    useMemo(
      () => (
        <>
          <ToolbarSearchInput
            placeholder="Search global services"
            value={searchString}
            onChange={setSearchString}
          />
          <Button
            small
            onClick={() => setIsModalOpen(true)}
          >
            New Global Service
          </Button>
          <YamlGeneratorModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            refetch={refetch}
            header="Create global service"
            kind="GlobalService"
          />
        </>
      ),
      [searchString, isModalOpen, refetch]
    )
  )

  return (
    <GlobalServicesTable
      searchString={searchString}
      setRefetch={setRefetch}
    />
  )
}
