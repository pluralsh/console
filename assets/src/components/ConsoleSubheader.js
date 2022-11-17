import { Flex } from 'honorable'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  theme,
} from 'pluralsh-design-system'

import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveLayoutContentContainer } from './layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from './layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from './layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from './layout/ResponsiveLayoutSpacer'

export default function ConsoleSubheader() {
  return (
    <Flex
      align="center"
      backgroundColor={theme.colors.grey[950]}
      borderBottom="1px solid border"
      minHeight={48}
    >
      <ResponsiveLayoutSidenavContainer
        width={240}
        paddingHorizontal="large"
      >
        <Flex gap="small">
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
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer><Flex align="justify"><Breadcrumbs /></Flex></ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>

  )
}
