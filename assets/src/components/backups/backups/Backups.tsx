import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  BACKUPS_ABS_PATH,
  BACKUPS_REL_PATH,
} from '../../../routes/backupRoutesConsts'

const BACKUPS_BACKUPS_BASE_CRUMBS: Breadcrumb[] = [
  { label: 'backups', url: BACKUPS_ABS_PATH },
  {
    label: 'backups',
    url: `${BACKUPS_ABS_PATH}/${BACKUPS_REL_PATH}`,
  },
]

export default function Backups() {
  useSetBreadcrumbs(BACKUPS_BACKUPS_BASE_CRUMBS)

  return <>...</>
}
