import { Div, Flex, Img } from 'honorable'
import { ArrowTopRightIcon, Button, theme } from '@pluralsh/design-system'

import { InstallerModal } from '../repos/installer/Modal'

import DemoBanner from './DemoBanner'

const APP_ICON = '/console-logo-white.png'

export default function Header() {
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
          height={32}
          marginVertical={4}
          src={APP_ICON}
          alt="Plural console"
          marginLeft={-3.5} /* Optically center with sidebar buttons */
        />
        <Flex grow={1} />
        <Button
          small
          tertiary
          fontWeight={600}
          endIcon={<ArrowTopRightIcon size={14} />}
          as="a"
          href="https://app.plural.sh"
          target="_blank"
          rel="noopener noreferrer"
        >
          Plural App
        </Button>
        <InstallerModal />
      </Flex>
    </Div>
  )
}
