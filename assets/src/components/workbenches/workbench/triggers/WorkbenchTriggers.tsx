import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { SideNavEntries } from 'components/layout/SideNavEntries'
import { GqlError } from 'components/utils/Alert'
import { useWorkbenchQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_REL_PATH,
  WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH,
  WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH,
} from 'routes/workbenchesRoutesConsts'

import { getWorkbenchBreadcrumbs } from '../Workbench'
import { FormCardSC } from '../create-edit/WorkbenchCreateOrEdit'

const DIRECTORY = [
  { path: WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH, label: 'Schedule trigger' },
  { path: WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH, label: 'Webhook trigger' },
]

export function WorkbenchTriggers() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const { pathname } = useLocation()
  const pathPrefix = `${getWorkbenchAbsPath(id)}/${WORKBENCHES_TRIGGERS_REL_PATH}`

  const { data, error } = useWorkbenchQuery({
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
  })

  const workbench = data?.workbench

  useSetBreadcrumbs(
    useMemo(
      () => [...getWorkbenchBreadcrumbs(workbench), { label: 'triggers' }],
      [workbench]
    )
  )

  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
      width="100%"
      overflow="auto"
      padding="large"
    >
      <Flex
        gap="medium"
        height="100%"
        minWidth={750}
        maxWidth={968}
        minHeight={0}
      >
        <div css={{ width: 200, flexShrink: 0 }}>
          <SideNavEntries
            directory={DIRECTORY}
            pathname={pathname}
            pathPrefix={pathPrefix}
          />
        </div>
        <FormCardSC>
          <Outlet />
        </FormCardSC>
      </Flex>
    </Flex>
  )
}
