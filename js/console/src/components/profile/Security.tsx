import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'

import { PROFILE_BREADCRUMBS } from './MyProfile'
import SecurityAccess from './SecurityAccess'
import SecurityPassword from './SecurityPassword'

const breadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'security' }]

export function Security() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      direction="column"
      gap="large"
    >
      <SecurityPassword />
      <SecurityAccess />
    </Flex>
  )
}
