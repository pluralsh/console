import {
  CaretRightIcon,
  Chip,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { UnstyledLink } from 'components/utils/Link'
import { TRUNCATE } from 'components/utils/truncate'
import { CSSProperties, ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'
import { ReadinessT, readinessToChipTitle, readinessToSeverity } from 'utils/status'

const GridTableBase = styled(Table)(({ theme }) => ({
  table: {
    display: 'grid',
    borderCollapse: 'collapse',
    minWidth: '100%',
  },
  th: {
    backgroundColor: theme.colors['fill-two'],
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  'thead, tbody, tr': {
    display: 'contents',
  },
  td: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
}))

export const GridTable = styled(GridTableBase)<{ $truncColIndex: string }>(({ columns, $truncColIndex = 0 }) => {
  const gridTemplateColumns = columns
    .reduce((val, _, i) => [
      ...val,
      i === $truncColIndex ? 'minmax(100px, 1fr)' : 'auto',
    ],
    [])
    .join(' ')

  const ret = {
    table: {
      gridTemplateColumns,
    },
    ...(typeof $truncColIndex === 'number' && $truncColIndex >= 0
      ? {
        [`td:nth-child(${$truncColIndex + 1})`]: {
          '*': TRUNCATE,
        },
      }
      : {}),
  }

  console.log({ ret })

  return ret
})

const isNullishIsh = (val: any) => {
  if (typeof val === 'number') {
    return Number.isNaN(val)
  }

  return val === null || val === undefined || val === ''
}

export const TableText = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
}))

export const CaptionText = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

export const StatusChip = styled(({ readiness }: { readiness: ReadinessT }) => (
  <Chip severity={readinessToSeverity[readiness]}>
    {readinessToChipTitle[readiness]}
  </Chip>
))(_ => ({}))

export function UsageUnstyled({
  used,
  total,
  units,
  className,
}: {
  used?: any | null
  total?: any | null
  units?: ReactNode
  className?: string
}) {
  return (
    <TableText className={className}>
      {isNullishIsh(used) ? '—' : used}
      {' / '}
      {isNullishIsh(total) ? '—' : total}
      {units && ` ${units}`}
    </TableText>
  )
}
export const Usage = styled(UsageUnstyled)(_ => ({
  whiteSpace: 'nowrap',
}))

function TableCaretLinkUnstyled({
  textValue,
  ...props
}: ComponentProps<typeof UnstyledLink> & { textValue: string }) {
  return (
    <UnstyledLink {...props}>
      <IconFrame
        clickable
        textValue={textValue}
        size="medium"
        icon={<CaretRightIcon />}
      />
    </UnstyledLink>
  )
}

export const TableCaretLink = styled(TableCaretLinkUnstyled)(({ theme }) => ({
  'a&': {
    color: theme.colors['icon-default'],
  },
}))

export function ContainersReadyChip({
  ready = 0,
  total = 0,
}: {
  ready: number
  total: number
}) {
  const severity
    = ready === 0 ? 'error' : total === ready ? 'success' : 'warning'

  return (
    <Chip
      severity={severity}
      whiteSpace="nowrap"
    >
      {ready}/{total} ready
    </Chip>
  )
}

export const TABLE_HEIGHT = {
  maxHeight: 'clamp(390px, calc(100vh - 420px), 600px)',
} satisfies CSSProperties
