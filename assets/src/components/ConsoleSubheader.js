import { Flex } from 'honorable'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Button,
  theme,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveLayoutContentContainer } from './layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from './layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from './layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from './layout/ResponsiveLayoutSpacer'

export default function ConsoleSubheader() {
  const navigate = useNavigate()

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
            small
            // TODO: Add disabled state.
            paddingHorizontal="xsmall"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon />
          </Button>
          <Button
            floating
            small
            // TODO: Add disabled state.
            paddingHorizontal="xsmall"
            onClick={() => navigate(1)}
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
