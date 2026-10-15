import {
  Button,
  Code,
  IconFrame,
  ShareIcon,
  useCopyText,
} from '@pluralsh/design-system'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { CaptionP } from 'components/utils/typography/Text'
import { ReactNode, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { buildMonitoringShareUrl } from './monitoringShare'

export function WorkbenchMonitoringSharePopover({
  kind,
  pathname,
  active = false,
  children,
}: {
  kind: 'dashboard' | 'monitor'
  pathname: string
  // marks the icon, e.g. when a dashboard is shared publicly
  active?: boolean
  // replaces the default copy-link body
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  useOutsideClick(btnRef, () => setOpen(false))

  const shareUrl = useMemo(
    () => buildMonitoringShareUrl({ pathname, includeFiltersAndRange: false }),
    [pathname]
  )
  const { copied, handleCopy } = useCopyText(shareUrl)

  return (
    <WrapSC>
      <IconFrame
        ref={btnRef}
        clickable
        size="small"
        type="tertiary"
        icon={<ShareIcon />}
        textValue={active ? `Share ${kind} (shared publicly)` : `Share ${kind}`}
        onClick={() => setOpen((prev) => !prev)}
      />
      {active && <ActiveDotSC />}
      <ShareMenuSC
        type="header"
        linkStyles={false}
        isOpen={open}
        setIsOpen={setOpen}
        fillLevel={2}
      >
        <CaptionP
          $color="text-xlight"
          css={{
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Share
        </CaptionP>
        {children ?? (
          <>
            <Code
              showHeader={false}
              showLineNumbers={false}
              css={{ maxHeight: 120, overflow: 'auto' }}
            >
              {shareUrl}
            </Code>
            <Button
              small
              primary
              disabled={copied}
              onClick={handleCopy}
              css={{ width: '100%' }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </>
        )}
      </ShareMenuSC>
    </WrapSC>
  )
}

const WrapSC = styled.div({
  position: 'relative',
  whiteSpace: 'nowrap',
})

const ActiveDotSC = styled.span(({ theme }) => ({
  position: 'absolute',
  top: -2,
  right: -2,
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: theme.colors['icon-danger'],
  pointerEvents: 'none',
}))

const ShareMenuSC = styled(SimplePopupMenu)(({ theme }) => ({
  '&&': {
    width: 411,
    maxWidth: 'min(411px, calc(100vw - 32px))',
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px ${theme.spacing.medium}px`,
    gap: theme.spacing.medium,
    boxShadow: theme.boxShadows.moderate,
    display: 'flex',
    flexDirection: 'column',
    whiteSpace: 'normal',
  },
}))
