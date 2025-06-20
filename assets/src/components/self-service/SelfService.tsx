import { Flex } from '@pluralsh/design-system'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
import { useLogin } from 'components/contexts'
import { SubTabs, SubtabDirectory } from 'components/utils/SubTabs'
import { Outlet } from 'react-router-dom'
import {
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
  PR_QUEUE_ABS_PATH,
  PR_SCM_ABS_PATH,
} from 'routes/selfServiceRoutesConsts'

const getDirectory = (prsEnabled: boolean): SubtabDirectory => [
  {
    path: CATALOGS_ABS_PATH,
    label: 'Service catalogs',
  },
  {
    path: PR_QUEUE_ABS_PATH,
    label: 'Outstanding PRs',
    enabled: prsEnabled,
  },
  {
    path: PR_AUTOMATIONS_ABS_PATH,
    label: 'PR automations',
    enabled: prsEnabled,
  },
  {
    path: PR_SCM_ABS_PATH,
    label: 'SCM management',
    enabled: prsEnabled,
  },
]

export function SelfService() {
  const isCDEnabled = useCDEnabled({ redirect: false })
  const { personaConfiguration } = useLogin()
  const prsEnabled =
    isCDEnabled &&
    !!(personaConfiguration?.all || personaConfiguration?.sidebar?.pullRequests)
  return (
    <Flex
      direction="column"
      gap="medium"
    >
      <SubTabs directory={getDirectory(prsEnabled)} />
      <Outlet />
    </Flex>
  )
}
