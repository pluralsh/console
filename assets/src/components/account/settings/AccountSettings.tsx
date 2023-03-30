import { ArrowTopRightIcon, Button } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

const Description = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
}))

export default function AccountSettings() {
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
