import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { useWorkbenchQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { Link, Outlet, useMatch, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_TRIGGERS_REL_PATH,
  WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH,
  WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH,
} from 'routes/workbenchesRoutesConsts'

import { getWorkbenchBreadcrumbs } from '../Workbench'
import {
  FormCardSC,
  SidebarBtnSC,
  WorkbenchSplitLayoutSC,
} from '../create-edit/WorkbenchCreateOrEdit'

const DIRECTORY = [
  { path: WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH, label: 'Schedule trigger' },
  { path: WORKBENCHES_TRIGGERS_WEBHOOK_REL_PATH, label: 'Webhook trigger' },
]

export function WorkbenchTriggers() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const pathPrefix = `${getWorkbenchAbsPath(id)}/${WORKBENCHES_TRIGGERS_REL_PATH}`
  const tab =
    useMatch(`${pathPrefix}/:tab`)?.params.tab ??
    WORKBENCHES_TRIGGERS_SCHEDULE_REL_PATH

  const { data, loading, error } = useWorkbenchQuery({
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
      <StackedText
        loading={!data && loading}
        first={workbench?.name}
        second={workbench?.description}
      />
      <WorkbenchSplitLayoutSC>
        <Flex
          direction="column"
          width={200}
        >
          {DIRECTORY.map(({ path, label }) => (
            <SidebarBtnSC
              key={path}
              tertiary
              as={Link}
              to={path}
              $active={path === tab}
            >
              {label}
            </SidebarBtnSC>
          ))}
        </Flex>
        <FormCardSC>
          <Outlet />
        </FormCardSC>
      </WorkbenchSplitLayoutSC>
    </Flex>
  )
}
