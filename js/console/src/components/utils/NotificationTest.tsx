import {
  Banner,
  Button,
  Flex,
  styledThemeDark,
  styledThemeLight,
} from '@pluralsh/design-system'
import { CSSProperties, ReactNode, useState } from 'react'
import styled, { ThemeProvider } from 'styled-components'

import {
  SimpleToastProvider,
  useSimpleToast,
} from 'components/utils/SimpleToastContext'

const SEVERITIES = ['danger', 'info', 'warning', 'success'] as const

type DesignSeverity = (typeof SEVERITIES)[number]
type ConsoleTheme = typeof styledThemeDark

const compactHeading = {
  danger: 'You have an error.',
  info: 'Here’s some info.',
  warning: 'Here’s a warning.',
  success: 'Success!',
} as const satisfies Record<DesignSeverity, string>

const description =
  'Your {cluster name} had three incidents while attempting to upgrade. To fix them, visit '

function colorVars(colors: ConsoleTheme['colors']): CSSProperties {
  const style: Record<string, string> = {}

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string') style[`--color-${key}`] = value
  }

  return style
}

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

function ModeColumn({ theme, label }: { theme: ConsoleTheme; label: string }) {
  return (
    <ThemeProvider theme={theme}>
      <PanelSC style={colorVars(theme.colors)}>
        <LabelSC>{label}</LabelSC>
        <Gallery />
      </PanelSC>
    </ThemeProvider>
  )
}

function Gallery() {
  const [dismissed, setDismissed] = useState<ReadonlyArray<string>>([])
  const dismiss = (key: string) =>
    setDismissed((current) =>
      current.includes(key) ? current : [...current, key]
    )

  return (
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
  )
}

function ToastButtons() {
  const { popToast } = useSimpleToast()

  return (
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
      <PageSC>
        <ToastButtons />
        <ColumnsSC>
          <ModeColumn
            theme={styledThemeDark}
            label="Dark"
          />
          <ModeColumn
            theme={styledThemeLight}
            label="Light"
          />
        </ColumnsSC>
      </PageSC>
    </SimpleToastProvider>
  )
}

const PageSC = styled.div(({ theme }) => ({
  minHeight: '100vh',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.xlarge,
  backgroundColor: theme.colors['page-background'],
}))

const ColumnsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  gap: theme.spacing.xlarge,
}))

const PanelSC = styled.section(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  color: theme.colors.text,
  padding: theme.spacing.xlarge,
  borderRadius: theme.borderRadiuses.large,
}))

const LabelSC = styled.h2(({ theme }) => ({
  ...theme.partials.text.subtitle2,
  margin: 0,
  marginBottom: theme.spacing.large,
  color: theme.colors.text,
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
