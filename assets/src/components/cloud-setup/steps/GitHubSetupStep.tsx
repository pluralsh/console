import { Button, Chip, Flex } from '@pluralsh/design-system'
import { BasicTextButton } from 'components/utils/typography/BasicTextButton'
import { use, useLayoutEffect } from 'react'
import { useTheme } from 'styled-components'
import { CloudWelcomeCtx, CloudWelcomeStep } from '../CloudConsoleWelcomeModal'

export function GitHubSetupStep() {
  const { colors } = useTheme()
  const { setModalActions, setStep, setOpen } = use(CloudWelcomeCtx)

  useLayoutEffect(() => {
    setModalActions(
      <Flex
        justify="space-between"
        width="100%"
      >
        <Flex
          gap="small"
          align="center"
        >
          <Chip size="large">TODO</Chip>
          <BasicTextButton
            onClick={() => setStep(CloudWelcomeStep.Authenticate)}
          >
            Skip
          </BasicTextButton>
        </Flex>
        <Button onClick={() => setStep(CloudWelcomeStep.Authenticate)}>
          Next
        </Button>
      </Flex>
    )
  }, [colors, setModalActions, setOpen, setStep])
  return <div>GitHubSetupStep</div>
}
