import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { FLOWS_ABS_PATH } from 'routes/flowRoutesConsts'

const breadcrumbs: Breadcrumb[] = [{ label: 'flows', url: FLOWS_ABS_PATH }]

export function Flows() {
  useSetBreadcrumbs(breadcrumbs)
  return <div>Flows</div>
}
