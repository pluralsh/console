import { ComponentProps, useMemo } from 'react'
import { Table, useSetBreadcrumbs } from '@pluralsh/design-system'

import { PR_BASE_CRUMBS, PR_DEPENDENCIES_ABS_PATH } from 'routes/prRoutesConsts'

export const columns = []

export const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export const SERVICES_QUERY_PAGE_SIZE = 100

export default function Services() {
  // const theme = useTheme()

  useSetBreadcrumbs(
    useMemo(
      () => [
        ...PR_BASE_CRUMBS,
        {
          label: 'dependency dashboard',
          url: PR_DEPENDENCIES_ABS_PATH,
        },
      ],
      []
    )
  )

  return (
    <Table
      columns={[]}
      reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
      data={[]}
    />
  )
}
