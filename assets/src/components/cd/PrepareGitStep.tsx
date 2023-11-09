import { Code } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { CD_QUICKSTART_LINK } from 'routes/cdRoutesConsts'

import { StepBody, StepH, StepLink } from './ModalAlt'

const scaffoldTabs = [
  {
    key: 'nodejs',
    label: 'Node.js',
    language: 'sh',
    content: `plural scaffold --type nodejs --name <my-service>`,
  },
  {
    key: 'rails',
    label: 'Rails',
    language: 'sh',
    content: `plural scaffold --type rails --name <my-service>`,
  },
  {
    key: 'springboot',
    label: 'Spring boot',
    language: 'sh',
    content: `plural scaffold --type springboot --name <my-service>`,
  },
  {
    key: 'django',
    label: 'Django',
    language: 'sh',
    content: `plural scaffold --type django --name <my-service>`,
  },
]

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
          Need some help to Git ready? Use a plural scaffold to get started or
          read our{' '}
          <StepLink
            href={CD_QUICKSTART_LINK}
            target="_blank"
          >
            quick start guide
          </StepLink>
          .
        </StepBody>
      </div>
      <Code tabs={scaffoldTabs} />
    </div>
  )
}
