import {
  AppIcon,
  CaretRightIcon,
  Chip,
  ChipProps,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { SortingFn } from '@tanstack/table-core'
import { UnstyledLink } from 'components/utils/Link'
import { Maybe } from 'generated/graphql'
import { ComponentProps, ReactNode } from 'react'
import styled from 'styled-components'
import {
  PhaseT,
  phaseToSeverity,
  ReadinessT,
  readinessToLabel,
  readinessToSeverity,
} from 'utils/status'

import { roundToTwoPlaces } from './utils'

const isNullishIsh = (val: any) => {
  if (typeof val === 'number') {
    return Number.isNaN(val)
  }

  return val === null || val === undefined || val === ''
}

export const numishSort: SortingFn<any> = (thingA, thingB, colId) => {
  const a = thingA.getValue<any>(colId)
  const b = thingB.getValue<any>(colId)

  if (isNullishIsh(a) && isNullishIsh(b)) {
    return 0
  }
  if (isNullishIsh(a)) {
    return -1
  }
  if (isNullishIsh(b)) {
    return 1
  }

  return a - b
}

export const TableText = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
}))

export const CaptionText = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

export const PhaseChip = styled(
  ({ phase, ...props }: { phase: PhaseT } & ChipProps) => (
    <Chip
      severity={phaseToSeverity[phase]}
      {...props}
    >
      {phase}
    </Chip>
  )
)((_) => ({}))

export const StatusChip = styled(
  ({
    readiness,
    ...props
  }: {
    readiness: ReadinessT
  } & ChipProps) => (
    <Chip
      severity={readinessToSeverity[readiness]}
      {...props}
    >
      {readinessToLabel[readiness]}
    </Chip>
  )
)((_) => ({}))

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
    <div className={className}>
      {isNullishIsh(used)
        ? '—'
        : typeof used === 'number'
          ? roundToTwoPlaces(used)
          : used}
      {' / '}
      {isNullishIsh(total)
        ? '—'
        : typeof total === 'number'
          ? roundToTwoPlaces(total)
          : total}
      {units && ` ${units}`}
    </div>
  )
}
export const Usage = styled(UsageUnstyled)({
  whiteSpace: 'nowrap',
})

export const UsageText = styled.div(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  color: theme.colors['text-light'],
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
        tooltip={textValue}
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

export function LabelWithIcon({
  label,
  icon,
}: {
  label?: Maybe<string>
  icon?: Maybe<string>
}) {
  return (
    <Flex
      gap="xsmall"
      alignItems="center"
    >
      {icon && (
        <AppIcon
          size="xxsmall"
          url={icon}
        />
      )}
      {label && <div>{label}</div>}
    </Flex>
  )
}

export const TabularNumbers = styled.span(() => ({
  fontVariantNumeric: 'tabular-nums',
}))
