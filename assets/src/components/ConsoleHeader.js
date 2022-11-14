import {
  A,
  Div,
  Flex,
  P,
} from 'honorable'
import { theme } from 'pluralsh-design-system'
import { useContext } from 'react'

import { AutoRefresh } from './AutoRefresh'

import { Breadcrumbs } from './Breadcrumbs'

import { LoginContext } from './contexts'

const APP_ICON = `${process.env.PUBLIC_URL}/console-full.png`

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
      backgroundColor={theme.colors.grey[950]}
      borderBottom="1px solid border"
      position="sticky"
      top={0}
    >
      <DemoBanner />
      <Flex>
        <img
          height="50px"
          alt=""
          src={APP_ICON}
        />
        <Breadcrumbs />
        <AutoRefresh />
      </Flex>

      {/*

        <Box
          direction="row"
          fill
          gap="xsmall"
          justify="end"
          pad={{ horizontal: 'medium' }}
          align="center"
        >

          <Icon
            icon={<Install size="18px" />}
            text="Install"
            size="40px"
            selected={open}
            align={{ top: 'bottom' }}
            onClick={() => setOpen(true)}
          />
          <Notifications />
          <Installations />
        </Box>
        {open && <Installer setOpen={setOpen} />}
      </Box> */}
    </Div>

  )
}
