import { Button, Checkbox, Codeline, Flex } from '@pluralsh/design-system'
import { InlineLink } from 'components/utils/typography/InlineLink'
import { useLayoutEffect, use, useState } from 'react'
import { useTheme } from 'styled-components'
import { CloudWelcomeCtx, CloudWelcomeStep } from '../CloudConsoleWelcomeModal'
import { GenerateAccessToken } from 'components/utils/GenerateAccessToken'
import { GqlError, GqlErrorType } from 'components/utils/Alert'

export function AuthenticateStep() {
  const { colors } = useTheme()
  const { setModalActions, setStep, setOpen } = use(CloudWelcomeCtx)
  const [isChecked, setIsChecked] = useState(false)
  const [error, setError] = useState<GqlErrorType | null>(null)

  useLayoutEffect(() => {
    setModalActions(
      <Flex
        gap="medium"
        justify="space-between"
        width="100%"
      >
        <Checkbox
          small
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          {...{ '& .label': { userSelect: 'none', textWrap: 'nowrap' } }}
        >
          {`I successfully authenticated my cloud instance locally.`}
          <span css={{ color: colors['text-danger'] }}>*</span>
        </Checkbox>
        <Flex gap="medium">
          <Button
            onClick={() => setStep(CloudWelcomeStep.Learn)}
            disabled={!isChecked}
          >
            Next
          </Button>
        </Flex>
      </Flex>
    )
  }, [colors, isChecked, setModalActions, setOpen, setStep])

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {error && <GqlError error={error} />}
      <span>
        To finish configuring Plural Console for your new cloud instance, you
        must generate an access token and enter it into a command in your local
        terminal.
      </span>
      <Flex
        direction="column"
        gap="small"
      >
        <span>
          Run `plural up --cloud` in the Plural CLI from your local terminal. If
          you have not yet installed the Plural CLI, learn how{' '}
          <InlineLink
            href="https://docs.plural.sh/getting-started/first-steps/cli-quickstart"
            target="_blank"
            rel="noreferrer"
          >
            here
          </InlineLink>
          .
        </span>
        <Codeline css={{ background: colors['fill-two'] }}>
          plural up --cloud
        </Codeline>
      </Flex>
      <Flex
        direction="column"
        gap="small"
      >
        <span>
          The command will prompt you to enter the newly generated access token.
          After you enter it, you should be all set.
        </span>
        <GenerateAccessToken setError={setError} />
      </Flex>
    </Flex>
  )
}
