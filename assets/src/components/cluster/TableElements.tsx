import {
  AppIcon,
  CaretRightIcon,
  Chip,
  IconFrame,
  Tooltip,
} from '@pluralsh/design-system'
import { UnstyledLink } from 'components/utils/Link'
import { Maybe } from 'generated/graphql'
import { Div, Flex, Span } from 'honorable'
import { CSSProperties, ComponentProps, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import {
  ReadinessT,
  readinessToColor,
  readinessToLabel,
  readinessToSeverity,
} from 'utils/status'

import { ContainerStatus } from './pods/PodsList'
import { roundToTwoPlaces } from './utils'

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
    {readinessToLabel[readiness]}
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
          {statuses.map(({ name, readiness }, i) => (
            <Flex
              key={i}
              whiteSpace="nowrap"
            >
              <Span>{name}:&nbsp;</Span>
              <Span
                color={readinessToColor[readiness]}
                fontWeight={600}
              >
                {readinessToLabel[readiness]}
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

export function LabelWithIcon({
  label,
  icon,
}: {
  label?: Maybe<string>
  icon?: Maybe<string>
}) {
  const theme = useTheme()

  return (
    <Flex
      gap={theme.spacing.xsmall}
      alignItems="center"
    >
      {icon && (
        <AppIcon
          size="xxsmall"
          url={icon}
        />
      )}
      {label && <Div>{label}</Div>}
    </Flex>
  )
}

export const TABLE_HEIGHT = {
  maxHeight: 'clamp(390px, calc(100vh - 420px), 600px)',
} satisfies CSSProperties
