import {
  ArrowTopRightIcon,
  Button,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { useMemo } from 'react'

import { BREADCRUMBS } from '../Account'

const Description = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
}))

export default function AccountSettings() {
  useSetBreadcrumbs(
    useMemo(
      () => [
        ...BREADCRUMBS,
        { label: 'account settings', url: '/account/settings' },
      ],
      []
    )
  )

  return (
    <ScrollablePage
      scrollable={false}
      heading="Account settings"
    >
      <Description>
        Manage your account settings from app.plural.sh.
      </Description>
      <Button
        as={Link}
        to="https://app.plural.sh/account/edit"
        target="_blank"
        rel="noopener noreferrer"
        endIcon={<ArrowTopRightIcon />}
        width="max-content"
        marginTop="small"
      >
        Edit in app.plural.sh
      </Button>
    </ScrollablePage>
  )
}
