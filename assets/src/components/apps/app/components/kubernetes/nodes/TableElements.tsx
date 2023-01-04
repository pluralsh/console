import {
  Table as BaseTable,
  CaretRightIcon,
  Chip,
  IconFrame,
} from '@pluralsh/design-system'
import { UnstyledLink } from 'components/utils/Link'
import { ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'
import { ReadinessT, readinessToChipTitle, readinessToSeverity } from 'utils/status'

export const NTable = styled(BaseTable)(({ theme }) => ({
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
}))

const isNullishIsh = (val: any) => {
  if (typeof val === 'number') {
    return Number.isNaN(val)
  }

  return val === null || val === undefined || val === ''
}

export const TableText = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
  '*:where(a) &': {
    '&:hover': {
      ...theme.partials.text.inlineLink,
    },
  },
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
  className?:string,
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
