import { ApolloError } from '@apollo/client'
import {
  Button,
  Checkbox,
  Codeline,
  Flex,
  Modal,
} from '@pluralsh/design-system'

import { GqlError } from 'components/utils/Alert'
import { GenerateAccessToken } from 'components/utils/GenerateAccessToken'
import { InlineLink } from 'components/utils/typography/InlineLink'

import { useState } from 'react'
import { useTheme } from 'styled-components'

export function CloudConsoleWelcomeModal() {
  const theme = useTheme()
  const [open, setOpen] = useState(true)
  const [canClose, setCanClose] = useState(false)
  const [error, setError] = useState<ApolloError | undefined>(undefined)

  return (
    <Modal
      open={open}
      actions={
        <Button
          onClick={() => setOpen(false)}
          disabled={!canClose}
        >
          I&apos;m done
        </Button>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        {error && <GqlError error={error} />}
        <span>
          To finish configuring Plural Console for your new cloud instance, you
          must generate an access token and enter it into a command in your
          local terminal.
        </span>

        <GenerateAccessToken setError={setError} />
        <span>
          Next, run this command in the Plural CLI from your local terminal. If
          you have not yet installed the Plural CLI, learn how{' '}
          <InlineLink
            href="https://docs.plural.sh/getting-started/quickstart#install-plural-cli"
            target="_blank"
            rel="noreferrer"
          >
            here
          </InlineLink>
          .
        </span>
        <Codeline css={{ background: theme.colors['fill-two'] }}>
          plural up --cloud
        </Codeline>
        <span>
          The command will prompt you to enter the newly generated access token.
          After you enter it, you should be all set.
        </span>
        <Checkbox
          small
          checked={canClose}
          onChange={(e) => setCanClose(e.target.checked)}
          css={{ '& .label': { userSelect: 'none' } }}
        >
          I successfully authenticated my cloud instance locally.
          <span css={{ color: theme.colors['text-danger'] }}>*</span>
        </Checkbox>
      </Flex>
    </Modal>
  )
}
