import {
  CaretRightIcon,
  Chip,
  IconFrame,
  Table,
  Tooltip,
} from '@pluralsh/design-system'
import { UnstyledLink } from 'components/utils/Link'
import { TRUNCATE } from 'components/utils/truncate'
import { Flex, Span } from 'honorable'
import { CSSProperties, ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'
import {
  ReadinessT,
  readinessToChipTitle,
  readinessToColor,
  readinessToSeverity,
} from 'utils/status'

import { ContainerStatus } from './pods/PodList'

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

export const GridTable = styled(GridTableBase)<{ $truncColIndexes: number[] }>(({ columns, $truncColIndexes = [] }) => {
  const gridTemplateColumns = columns
    .reduce((val, _, i) => [
      ...val,
      ($truncColIndexes as number[]).findIndex(truncIdx => truncIdx === i) >= 0
        ? 'minmax(100px, 1fr)'
        : 'auto',
    ],
    [])
    .join(' ')

  const truncStyles = $truncColIndexes.reduce((prev, truncIdx) => ({
    ...prev,
    [`td:nth-child(${truncIdx + 1})`]: {
      '*': TRUNCATE,
    },
  }),
      {} as CSSProperties)

  const ret = {
    table: {
      gridTemplateColumns,
    },
    ...truncStyles,
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
  statuses = [],
}: {
  ready: number
  total: number
  statuses: ContainerStatus[]
}) {
  const severity
    = ready === 0 ? 'error' : total === ready ? 'success' : 'warning'

  return (
    <Tooltip
      label={(
        <>
          {statuses.map(({ name, readiness }) => (
            <Flex whiteSpace="nowrap">
              <Span>{name}:&nbsp;</Span>
              <Span
                color={readinessToColor[readiness]}
                fontWeight={600}
              >
                {readiness}
              </Span>
            </Flex>
          ))}
        </>
      )}
    >
      <Chip
        cursor="help"
        severity={severity}
        whiteSpace="nowrap"
      >
        {ready}/{total} ready
      </Chip>
    </Tooltip>
  )
}

export const TABLE_HEIGHT = {
  maxHeight: 'clamp(390px, calc(100vh - 420px), 600px)',
} satisfies CSSProperties
