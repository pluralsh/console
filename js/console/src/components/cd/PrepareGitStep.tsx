import { useTheme } from 'styled-components'

import { DOCS_CD_QUICKSTART_LINK } from 'utils/constants'

import { StepBody, StepH, StepLink } from './ModalAlt'

export function PrepareGitStep() {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xxsmall,
        }}
      >
        <StepH>Step 1. Prepare your Git repository</StepH>
        <StepBody>
          Need some help to Git ready? Read our{' '}
          <StepLink
            href={DOCS_CD_QUICKSTART_LINK}
            target="_blank"
          >
            quick start guide
          </StepLink>
          .
        </StepBody>
      </div>
    </div>
  )
}
