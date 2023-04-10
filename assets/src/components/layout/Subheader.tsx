import { Flex } from 'honorable'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Breadcrumbs,
  IconFrame,
  theme,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { ResponsiveLayoutContentContainer } from '../utils/layout/ResponsiveLayoutContentContainer'
import { ResponsiveLayoutSidecarContainer } from '../utils/layout/ResponsiveLayoutSidecarContainer'
import { ResponsiveLayoutSidenavContainer } from '../utils/layout/ResponsiveLayoutSidenavContainer'
import { ResponsiveLayoutSpacer } from '../utils/layout/ResponsiveLayoutSpacer'

import AppNav from './AppNav'

export default function Subheader() {
  const navigate = useNavigate()

  return (
    <Flex
      align="center"
      backgroundColor={theme.colors?.grey[950]}
      borderBottom="1px solid border"
      minHeight={48}
      paddingHorizontal="large"
    >
      <ResponsiveLayoutSidenavContainer
        gap="small"
        display="flex"
        width={240}
      >
        <IconFrame
          clickable
          size="small"
          icon={<ArrowLeftIcon />}
          onClick={() => navigate(-1)}
          textValue="Back"
          type="floating"
        />
        <IconFrame
          clickable
          size="small"
          icon={<ArrowRightIcon />}
          onClick={() => navigate(1)}
          textValue="Forward"
          type="floating"
        />
      </ResponsiveLayoutSidenavContainer>
      <ResponsiveLayoutSpacer />
      <ResponsiveLayoutContentContainer>
        <Breadcrumbs />
      </ResponsiveLayoutContentContainer>
      <ResponsiveLayoutSidecarContainer />
      <ResponsiveLayoutSpacer />
      <AppNav />
    </Flex>
  )
}
