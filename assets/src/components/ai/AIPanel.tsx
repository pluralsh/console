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
  header,
  subheader,
  children,
  ...props
}: {
  open: boolean
  onClose: () => void
  header: string
  subheader: string
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
          <IconFrame
            clickable
            icon={<CloseIcon />}
            onClick={onClose}
            tooltip="Close"
          />
        </div>
        <div css={{ flexGrow: 1, overflow: 'auto' }}>{children}</div>
        <div
          css={{
            alignItems: 'center',
            backgroundColor: theme.colors['fill-two'],
            borderTop: theme.borders.input,
            display: 'flex',
            gap: theme.spacing.small,
            padding: theme.spacing.large,
          }}
        >
          <Button
            flexGrow={1}
            onClick={onClose}
          >
            Got it, thanks!
          </Button>
        </div>
      </Card>
    </AIPanelOverlay>
  )
}
