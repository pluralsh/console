import {
  A,
  Div,
  Flex,
  Img,
  P,
} from 'honorable'
import {
  ArrowTopRightIcon,
  Button,
  DownloadIcon,
  theme,
} from 'pluralsh-design-system'
import { useContext, useState } from 'react'

import { AutoRefresh } from './AutoRefresh'

import { LoginContext } from './contexts'
import { Installations } from './Installations'

import { Installer } from './repos/Installer'

const APP_ICON = `${process.env.PUBLIC_URL}/console-logo-white.png`

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
  const [open, setOpen] = useState(false)

  return (
    <Div
      backgroundColor={theme.colors.grey[950]}
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
        <Button
          small
          floating
          fontWeight={600}
          endIcon={<DownloadIcon size={14} />}
          onClick={() => setOpen(true)}
        >
          Install
        </Button>
        {open && <Installer setOpen={setOpen} />}
        <Installations />
        <AutoRefresh />
      </Flex>
    </Div>

  )
}
