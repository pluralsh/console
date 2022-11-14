import { Flex } from 'honorable'
import { theme } from 'pluralsh-design-system'

import { Breadcrumbs } from './Breadcrumbs'

export default function ConsoleSubheader() {
  return (
    <Flex
      align="center"
      backgroundColor={theme.colors.grey[950]}
      borderBottom="1px solid border"
      paddingHorizontal="medium"
    >
      <Flex
        basis="25%"
        grow={1}
        shrink={1}
      >
        nav
      </Flex>
      <Flex
        basis="50%"
        grow={1}
        shrink={1}
      >
        <Breadcrumbs />
      </Flex>
    </Flex>

  )
}
