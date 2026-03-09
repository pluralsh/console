import { Button, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useWorkbenchQuery, WorkbenchTinyFragment } from 'generated/graphql'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_EDIT_REL_PATH,
} from 'routes/workbenchesRoutesConsts'

export const getWorkbenchBreadcrumbs = (
  workbench: Nullable<WorkbenchTinyFragment>
) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...(workbench
    ? [{ label: workbench.name, url: getWorkbenchAbsPath(workbench?.id) }]
    : []),
]

export function Workbench() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const {
    data,
    loading: _l,
    error: _e,
  } = useWorkbenchQuery({
    variables: { id },
  })
  const workbench = data?.workbench

  useSetBreadcrumbs(
    useMemo(() => getWorkbenchBreadcrumbs(workbench), [workbench])
  )
  return (
    <Flex
      direction="column"
      gap="small"
    >
      Workbench
      <Button
        as={Link}
        to={WORKBENCHES_EDIT_REL_PATH}
        alignSelf="start"
      >
        Edit
      </Button>
    </Flex>
  )
}
