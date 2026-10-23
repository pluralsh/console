import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { SubtabDirectory } from 'components/utils/SubTabs'
import { useMemo } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import {
  POLICIES_ABS_PATH,
  POLICIES_ATTACHMENT_RULES_ABS_PATH,
} from 'routes/securityRoutesConsts'
import { getPoliciesBreadcrumbs } from './policiesBreadcrumbs'

export const POLICIES_DESCRIPTION =
  'OPA/Rego documents that govern workbench tools and stack runs. Attach them to workbenches and stacks. If any matching policy denies, the action is rejected.'

export const POLICIES_TABS: SubtabDirectory = [
  { label: 'Policies', path: POLICIES_ABS_PATH },
  { label: 'Attachment rules', path: POLICIES_ATTACHMENT_RULES_ABS_PATH },
]

export function Policies() {
  const { tab = '' } = useMatch(`${POLICIES_ABS_PATH}/:tab`)?.params ?? {}

  useSetBreadcrumbs(useMemo(() => getPoliciesBreadcrumbs(tab), [tab]))

  return <Outlet />
}
