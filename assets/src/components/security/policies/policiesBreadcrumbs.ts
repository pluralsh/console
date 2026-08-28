import {
  POLICIES_ABS_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import { getTabCrumb } from 'utils/getTabCrumb'

export const getPoliciesBreadcrumbs = (tab?: Nullable<string>) => [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
  ...getTabCrumb(POLICIES_ABS_PATH, tab),
]
