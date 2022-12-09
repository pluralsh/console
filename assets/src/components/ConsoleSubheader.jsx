import { Flex } from 'honorable'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  IconFrame,
  theme,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { Breadcrumbs } from './Breadcrumbs'
import { ResponsiveLayoutContentContainer } from './layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from './layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from './layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from './layout/ResponsiveLayoutSpacer'

// TODO: Disable previous and next button based on navigation history.
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
        gap="small"
        display="flex"
        paddingHorizontal="large"
        width={240}
      >
        <IconFrame
          clickable
          icon={<ArrowLeftIcon />}
          onClick={() => navigate(-1)}
          type="floating"
        />
        <IconFrame
          clickable
          icon={<ArrowRightIcon />}
          onClick={() => navigate(1)}
          type="floating"
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer><Flex align="justify"><Breadcrumbs /></Flex></ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer width={200} />
      <ResponsiveLayoutSpacer />
    </Flex>

  )
}
