import {
  Button,
  Card,
  CardProps,
  CloseIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { ReactNode } from 'react'
import { AIPanelOverlay } from './AIPanelOverlay.tsx'

export default function AIPanel({
  open,
  onClose,
  showCloseIcon = false,
  showClosePanel = false,
  header,
  subheader,
  footer,
  children,
  ...props
}: {
  open: boolean
  onClose: () => void
  showCloseIcon?: boolean
  showClosePanel?: boolean
  header: string
  subheader: string
  footer?: ReactNode
  children: ReactNode
} & CardProps) {
  const theme = useTheme()

  return (
    <AIPanelOverlay
      open={open}
      onClose={onClose}
    >
      <Card
        fillLevel={1}
        css={{
          border: theme.borders.input,
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          maxHeight: 720,
          minHeight: 0,
          overflow: 'hidden',
        }}
        {...props}
      >
        <div
          css={{
            alignItems: 'center',
            backgroundColor: theme.colors['fill-two'],
            borderBottom: theme.borders.input,
            display: 'flex',
            gap: theme.spacing.small,
            padding: theme.spacing.large,
          }}
        >
          <div css={{ flexGrow: 1 }}>
            <div css={{ ...theme.partials.text.subtitle2 }}>{header}</div>
            <div
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-light'],
              }}
            >
              {subheader}
            </div>
          </div>
          {showCloseIcon && (
            <IconFrame
              clickable
              icon={<CloseIcon />}
              onClick={onClose}
              tooltip="Close"
            />
          )}
        </div>
        <div
          css={{ flexGrow: 1, overflow: 'auto', padding: theme.spacing.medium }}
        >
          {children}
        </div>
        {showClosePanel && (
          <div
            css={{
              alignItems: 'center',
              backgroundColor: theme.colors['fill-two'],
              borderTop: theme.borders.input,
              display: 'flex',
              gap: theme.spacing.small,
              padding: theme.spacing.large,
              '> *': {
                flexGrow: 1,
              },
            }}
          >
            <Button
              onClick={onClose}
              secondary={!!footer}
              floating={!!footer}
            >
              Got it, thanks!
            </Button>
            {footer && footer}
          </div>
        )}
      </Card>
    </AIPanelOverlay>
  )
}
