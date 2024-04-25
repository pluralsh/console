import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

function Policies() {
  useSetBreadcrumbs(breadcrumbs)

  return <div>policies list</div>
}

export default Policies
