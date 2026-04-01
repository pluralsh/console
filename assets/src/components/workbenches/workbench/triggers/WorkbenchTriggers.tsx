import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useWorkbenchQuery } from 'generated/graphql'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WORKBENCH_PARAM_ID } from 'routes/workbenchesRoutesConsts'

import { getWorkbenchBreadcrumbs } from '../Workbench'

export function WorkbenchTriggers() {
  const id = useParams()[WORKBENCH_PARAM_ID]

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
      triggers for {workbench?.name}
    </Flex>
  )
}
