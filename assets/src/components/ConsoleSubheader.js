import { Flex } from 'honorable'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  theme,
} from 'pluralsh-design-system'

import { Breadcrumbs } from './Breadcrumbs'

export default function ConsoleSubheader() {
  return (
    <Flex
      align="center"
      backgroundColor={theme.colors.grey[950]}
      borderBottom="1px solid border"
      minHeight={48}
      paddingHorizontal="large"
    >
      <Flex
        basis="25%"
        grow={1}
        shrink={1}
        gap="small"
      >
        <Button
          floating
          disabled
          small
          paddingHorizontal="xsmall"
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          floating
          disabled
          small
          paddingHorizontal="xsmall"
        >
          <ArrowRightIcon />
        </Button>
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
