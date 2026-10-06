import { Banner, Button, Flex } from '@pluralsh/design-system'
import { ReactNode, useEffect, useState } from 'react'
import styled from 'styled-components'

import {
  SimpleToastProvider,
  useSimpleToast,
} from 'components/utils/SimpleToastContext'

const SEVERITIES = ['danger', 'info', 'warning', 'success'] as const

type DesignSeverity = (typeof SEVERITIES)[number]

const compactHeading = {
  danger: 'You have an error.',
  info: 'Here’s some info.',
  warning: 'Here’s a warning.',
  success: 'Success!',
} as const satisfies Record<DesignSeverity, string>

const description =
  'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '

function ActionLink() {
  return (
    <LinkSC
      href="#action"
      onClick={(event) => event.preventDefault()}
    >
      Action
    </LinkSC>
  )
}

function Description() {
  return (
    <>
      {description}
      <LinkSC
        href="#incidents"
        onClick={(event) => event.preventDefault()}
      >
        incidents
      </LinkSC>
      .
    </>
  )
}

function NotificationCases() {
  const { popToast } = useSimpleToast()
  const [dismissed, setDismissed] = useState<ReadonlyArray<string>>([])

  useEffect(() => {
    popToast({
      heading: compactHeading.danger,
      content: <Description />,
      severity: 'danger',
      delayTimeout: 'none',
    })
  }, [popToast])

  const dismiss = (key: string) =>
    setDismissed((current) =>
      current.includes(key) ? current : [...current, key]
    )

  return (
    <PageSC>
      <Flex
        direction="column"
        align="flex-start"
        gap="large"
      >
        <Flex
          gap="small"
          wrap="wrap"
        >
          <Button
            secondary
            onClick={() =>
              popToast({
                heading: compactHeading.danger,
                content: <Description />,
                severity: 'danger',
                delayTimeout: 'none',
              })
            }
          >
            Show error toast
          </Button>
          <Button
            secondary
            onClick={() =>
              popToast({
                content: compactHeading.success,
                severity: 'success',
                delayTimeout: 'none',
              })
            }
          >
            Show success toast
          </Button>
        </Flex>
        <CaseColumnSC>
          {SEVERITIES.map((severity) => {
            const key = `${severity}-compact`

            if (dismissed.includes(key)) return null

            return (
              <Case
                key={key}
                severity={severity}
                heading={compactHeading[severity]}
                action={<ActionLink />}
                fullWidth={severity !== 'success'}
                onClose={() => dismiss(key)}
              />
            )
          })}
          {SEVERITIES.map((severity) => {
            const key = `${severity}-detail`

            if (dismissed.includes(key)) return null

            return (
              <Case
                key={key}
                severity={severity}
                heading={compactHeading[severity]}
                fullWidth
                onClose={() => dismiss(key)}
              >
                <Description />
              </Case>
            )
          })}
        </CaseColumnSC>
      </Flex>
    </PageSC>
  )
}

function Case({
  severity,
  heading,
  action,
  fullWidth,
  onClose,
  children,
}: {
  severity: DesignSeverity
  heading: string
  action?: ReactNode
  fullWidth?: boolean
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <Banner
      severity={severity === 'danger' ? 'error' : severity}
      heading={heading}
      action={action}
      fullWidth={fullWidth}
      onClose={onClose}
    >
      {children}
    </Banner>
  )
}

export default function NotificationTest() {
  return (
    <SimpleToastProvider>
      <NotificationCases />
    </SimpleToastProvider>
  )
}

const PageSC = styled.div(({ theme }) => ({
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: theme.spacing.xlarge,
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['page-background']
      : theme.colors['fill-zero'],
}))

const CaseColumnSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing.xxlarge,
  width: 464,
}))

const LinkSC = styled.a(({ theme }) => ({
  ...theme.partials.text.inlineLink,
}))
