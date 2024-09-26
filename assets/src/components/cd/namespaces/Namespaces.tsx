import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { CD_REL_PATH, NAMESPACES_REL_PATH } from 'routes/cdRoutesConsts'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import {
  ColAnnotations,
  ColLabels,
  ColLastActivity,
  ColName,
  ColProject,
} from './NamespacesColumns'
import { NamespacesTable } from './NamespacesTable'

export const columns = [
  ColName,
  ColAnnotations,
  ColLabels,
  ColProject,
  ColLastActivity,
]

const crumbs = [
  ...CD_BASE_CRUMBS,
  { label: 'namespaces', url: `/${CD_REL_PATH}/${NAMESPACES_REL_PATH}` },
]

export default function Namespaces() {
  useSetBreadcrumbs(crumbs)

  return <NamespacesTable />
}
