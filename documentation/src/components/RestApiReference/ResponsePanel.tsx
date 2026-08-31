/**
 * Response samples panel. Custom block matching design: no file icon,
 * green/amber/red status dot, Copy button without icon.
 */

import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  CheckIcon,
  CopyIcon,
  Highlight,
} from '@pluralsh/design-system'

import isEmpty from 'lodash/isEmpty'
import styled from 'styled-components'

import { useCopyText } from '@src/hooks/useCopyText'

import { StatusDot, StatusTab, StatusTabs, getStatusColor } from './shared'

import type { EndpointDetail, ResponseSample } from '@src/lib/openapi-rest'

const Panel = styled.div(({ theme }) => ({
  marginBottom: theme.spacing.large,
}))

const ResponseHeader = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
  minHeight: theme.spacing.xlarge + theme.spacing.xsmall * 2,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  borderBottom: theme.borders['fill-two'],
  backgroundColor: theme.colors['fill-two'],
  borderTopLeftRadius: theme.borderRadiuses.medium + 2,
  borderTopRightRadius: theme.borderRadiuses.medium + 2,
  ...theme.partials.text.overline,
  color: theme.colors['text-light'],
}))

const StatusBadge = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
}))

const CodeWrapper = styled.div(() => ({
  position: 'relative' as const,
}))

const CopyBtnWrap = styled.div(({ theme }) => ({
  position: 'absolute' as const,
  zIndex: 1,
  right: theme.spacing.medium,
  top: theme.spacing.medium,
}))

const CodeContent = styled.div(({ theme }) => ({
  overflow: 'auto',
  padding: `${theme.spacing.medium}px`,
}))

export function ResponsePanel({ detail }: { detail: EndpointDetail }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { responses } = detail

  useEffect(() => {
    setSelectedIndex((prev) =>
      isEmpty(responses) ? 0 : Math.min(prev, responses.length - 1)
    )
  }, [responses])

  if (isEmpty(responses)) return null

  const safeIndex = Math.min(selectedIndex, responses.length - 1)
  const selected = responses[safeIndex] as ResponseSample | undefined

  if (!selected) return null

  return (
    <Panel>
      {responses.length > 1 && (
        <StatusTabs>
          {responses.map((r, i) => (
            <StatusTab
              key={r.statusLabel}
              $active={i === safeIndex}
              onClick={() => setSelectedIndex(i)}
              type="button"
            >
              <StatusDot $color={getStatusColor(r.status)} />
              {r.statusLabel}
            </StatusTab>
          ))}
        </StatusTabs>
      )}
      <Card
        key={`${detail.id}-${selected.statusLabel}`}
        fillLevel={1}
        borderColor="border-fill-two"
      >
        <ResponseHeader>
          <span>Response samples</span>
          <StatusBadge>
            <StatusDot $color={getStatusColor(selected.status)} />
            {selected.statusLabel}
          </StatusBadge>
        </ResponseHeader>
        <ResponseCodeBlock content={selected.body} />
      </Card>
    </Panel>
  )
}

function ResponseCodeBlock({ content }: { content: string }) {
  const { copied, handleCopy } = useCopyText(content)

  return (
    <CodeWrapper>
      <CopyBtnWrap>
        <Button
          small
          floating
          startIcon={copied ? <CheckIcon /> : <CopyIcon />}
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy response'}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </CopyBtnWrap>
      <CodeContent>
        <Highlight language="json">{content}</Highlight>
      </CodeContent>
    </CodeWrapper>
  )
}
