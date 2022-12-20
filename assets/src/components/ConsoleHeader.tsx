import {
  A,
  Div,
  Flex,
  Img,
  P,
} from 'honorable'
import { ArrowTopRightIcon, Button, theme } from '@pluralsh/design-system'
import { useContext } from 'react'

import { LoginContext } from './contexts'
import { InstallerModal } from './repos/installer/Modal'

const APP_ICON = '/console-logo-white.png'

function DemoBanner() {
  const { configuration: { isDemoProject } } = useContext(LoginContext)

  if (!isDemoProject) return null

  return (
    <Div
      borderBottom="1px solid border"
      padding="small"
    >
      <P
        caption
        textAlign="center"
      >
        You are using a Plural demo GCP project, which will expire 6 hours after creation.
        If you'd like to learn how to deploy on your own cloud,&nbsp;
        <A
          inline
          href="https://docs.plural.sh/getting-started/quickstart"
          target="_blank"
          rel="noopener noreferrer"
        >
          visit our docs.
        </A>
      </P>
    </Div>
  )
}

export default function ConsoleHeader() {
  return (
    <Div
      backgroundColor={theme.colors?.grey[950]}
      borderBottom="1px solid border"
    >
      <DemoBanner />
      <Flex
        align="center"
        gap="medium"
        paddingHorizontal="medium"
        paddingVertical="xsmall"
      >
        <Img
          height={40}
          src={APP_ICON}
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
        {/* TODO: disable before commit until DS is merged */}
        <InstallerModal />
      </Flex>
    </Div>
  )
}
