import { Div, Flex, Img } from 'honorable'
import { ArrowTopRightIcon, Button, theme } from '@pluralsh/design-system'
import { useNavigate } from 'react-router-dom'

import { InstallerModal } from '../repos/installer/Modal'

import DemoBanner from './DemoBanner'

const APP_ICON = '/console-logo-white.png'

export default function Header() {
  const navigate = useNavigate()

  return (
    <Div
      backgroundColor={theme.colors?.grey[950]}
      borderBottom="1px solid border"
    >
      <DemoBanner />
      <Flex
        align="center"
        gap="medium"
        paddingHorizontal="large"
        paddingVertical="xsmall"
      >
        <Img
          cursor="pointer"
          height={32}
          marginVertical={4}
          src={APP_ICON}
          alt="Plural console"
          marginLeft={-2.0} /* Optically center with sidebar buttons */
          onClick={() => navigate('/')}
        />
        <Flex grow={1} />
        <Button
          small
          tertiary
          fontWeight={600}
          as="a"
          href="https://app.plural.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          Plural Account
        </Button>
        <InstallerModal />
      </Flex>
    </Div>
  )
}
