import { useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  POLICIES_ABS_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
]

export function Policies() {
  useSetBreadcrumbs(breadcrumbs)

  return null
}
