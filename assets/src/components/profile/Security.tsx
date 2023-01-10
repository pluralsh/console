import { ScrollablePage } from 'components/layout/ScrollablePage'
import { Flex } from 'honorable'

import SecurityAccess from './SecurityAccess'
import SecurityPassword from './SecurityPassword'

export function Security() {
  return (
    <ScrollablePage heading="Security">
      <Flex
        direction="column"
        gap="large"
      >
        <SecurityPassword /> {/* TODO: Hide if using OIDC. */}
        <SecurityAccess />
      </Flex>
    </ScrollablePage>
  )
}
