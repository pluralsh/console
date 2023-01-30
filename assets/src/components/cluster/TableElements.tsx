import {
  AppIcon,
  CaretRightIcon,
  Chip,
  IconFrame,
} from '@pluralsh/design-system'
import { UnstyledLink } from 'components/utils/Link'
import { Maybe } from 'generated/graphql'
import { Div, Flex } from 'honorable'
import { CSSProperties, ComponentProps, ReactNode } from 'react'
import styled, { useTheme } from 'styled-components'
import { ReadinessT, readinessToLabel, readinessToSeverity } from 'utils/status'

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
