import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { PROFILE_BREADCRUMBS } from './MyProfile'
import SecurityAccess from './SecurityAccess'
import SecurityPassword from './SecurityPassword'

const breadcrumbs = [...PROFILE_BREADCRUMBS, { label: 'security' }]

export function Security() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <ScrollablePage heading="Security">
      <Flex
        direction="column"
        gap="large"
      >
        <SecurityPassword />
        <SecurityAccess />
      </Flex>
    </ScrollablePage>
  )
}
