import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

const crumbs = [...CD_BASE_CRUMBS, { label: 'providers' }]

export default function Providers() {
  useSetBreadcrumbs(crumbs)

  return <>Providers page</>
}
