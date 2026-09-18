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
import { ButtonGroup } from 'components/utils/ButtonGroup'
import { CaptionP } from 'components/utils/typography/Text'
import { useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import type { MetricsTimeRange } from '../job/WorkbenchJobActivityResults'
import {
  buildMonitoringEmbedSnippet,
  buildMonitoringShareUrl,
} from './monitoringShare'

type ShareTab = 'link' | 'embed'

export function WorkbenchMonitoringSharePopover({
  kind,
  title,
  pathname,
  range,
  variables,
}: {
  kind: 'dashboard' | 'monitor'
  title: string
  pathname: string
  range?: MetricsTimeRange
  variables?: Record<string, string | string[]>
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ShareTab>('link')
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
  const embedSnippet = useMemo(
    () => buildMonitoringEmbedSnippet(shareUrl, title),
    [shareUrl, title]
  )
  const copyValue = tab === 'link' ? shareUrl : embedSnippet
  const { copied, handleCopy } = useCopyText(copyValue)

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
        <ButtonGroup
          tab={tab}
          onClick={(next) => setTab(next as ShareTab)}
          directory={[
            { path: 'link', label: 'Link' },
            { path: 'embed', label: 'Embed' },
          ]}
          fillLevel={2}
        />
        <Code
          language={tab === 'embed' ? 'html' : undefined}
          showHeader={false}
          showLineNumbers={false}
          css={{ maxHeight: 120, overflow: 'auto' }}
        >
          {copyValue}
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
          {copied
            ? 'Copied!'
            : tab === 'link'
              ? 'Copy link'
              : 'Copy embed code'}
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
