import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'

import SecurityAccess from './SecurityAccess'
import SecurityPassword from './SecurityPassword'

export default function Security() {
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
