import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import SecurityAccess from './SecurityAccess'
import SecurityPassword from './SecurityPassword'
import { PROFILE_BREADCRUMBS } from './MyProfile'

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
