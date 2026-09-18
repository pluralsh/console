import {
  Button,
  Checkbox,
  Code,
  IconFrame,
  ShareIcon,
  useCopyText,
} from '@pluralsh/design-system'
import { useOutsideClick } from 'components/hooks/useOutsideClick'
import { SimplePopupMenu } from 'components/layout/HeaderPopupMenu'
import { CaptionP } from 'components/utils/typography/Text'
import { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import type { MetricsTimeRange } from '../job/WorkbenchJobActivityResults'
import { buildMonitoringShareUrl } from './monitoringShare'

export function WorkbenchMonitoringSharePopover({
  kind,
  pathname,
  range,
  variables,
}: {
  kind: 'dashboard' | 'monitor'
  pathname: string
  range?: MetricsTimeRange
  variables?: Record<string, string | string[]>
}) {
  const [open, setOpen] = useState(false)
  const [includeFiltersAndRange, setIncludeFiltersAndRange] = useState(true)
  const btnRef = useRef<HTMLDivElement>(null)
  useOutsideClick(btnRef, () => setOpen(false))

  const canIncludeState = kind === 'dashboard'
  const shareUrl = useMemo(
    () =>
      buildMonitoringShareUrl({
        pathname,
        range,
        variables,
        includeFiltersAndRange: canIncludeState && includeFiltersAndRange,
      }),
    [pathname, range, variables, canIncludeState, includeFiltersAndRange]
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
        textValue={`Share ${kind}`}
        onClick={() => setOpen((prev) => !prev)}
      />
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
          Share {kind}
        </CaptionP>
        <Code
          showHeader={false}
          showLineNumbers={false}
          css={{ maxHeight: 120, overflow: 'auto' }}
        >
          {shareUrl}
        </Code>
        {canIncludeState && (
          <Checkbox
            checked={includeFiltersAndRange}
            onChange={({ target: { checked } }) =>
              setIncludeFiltersAndRange(checked)
            }
            small
          >
            Include filters and range
          </Checkbox>
        )}
        <Button
          small
          primary
          disabled={copied}
          onClick={handleCopy}
          css={{ width: '100%' }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </ShareMenuSC>
    </WrapSC>
  )
}

const WrapSC = styled.div({
  position: 'relative',
  whiteSpace: 'nowrap',
})

const ShareMenuSC = styled(SimplePopupMenu)(({ theme }) => ({
  '&&': {
    width: 411,
    maxWidth: 'min(411px, calc(100vw - 32px))',
    padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px ${theme.spacing.medium}px`,
    gap: theme.spacing.medium,
    boxShadow: theme.boxShadows.moderate,
    display: 'flex',
    flexDirection: 'column',
  },
}))
