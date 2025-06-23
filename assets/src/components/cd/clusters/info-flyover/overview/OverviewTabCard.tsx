import {
  ArrowRightIcon,
  Button,
  Card,
  CheckRoundedIcon,
  Chip,
  ChipSeverity,
  Flex,
  StatusIpIcon,
  WarningIcon,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2P } from 'components/utils/typography/Text'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'

type OverviewCardEntryStatus = 'success' | 'warning' | 'pending'

type OverviewCardEntry = {
  label: string
  status: OverviewCardEntryStatus
  onClick?: () => void
}

export function OverviewTabCard({
  title,
  subtitle,
  metric,
  metricSeverity,
  entries,
}: {
  title: string
  subtitle: string
  metric: string
  metricSeverity: ChipSeverity
  entries: OverviewCardEntry[]
}) {
  return (
    <OverviewCardSC>
      <Flex gap="large">
        <StackedText
          first={title}
          firstPartialType="body1Bold"
          firstColor="text"
          second={subtitle}
          secondPartialType="body2"
          secondColor="text-light"
          gap="xxsmall"
        />
        <Chip
          severity={metricSeverity}
          css={{ height: 32 }}
        >
          {metric}
        </Chip>
      </Flex>
      <Flex
        gap="xxsmall"
        direction="column"
      >
        {entries.map((entry) => (
          <OverviewCardEntry
            key={entry.label}
            status={entry.status}
            label={entry.label}
            onClick={entry.onClick}
          />
        ))}
      </Flex>
    </OverviewCardSC>
  )
}

function OverviewCardEntry({
  status,
  onClick,
  label,
}: {
  status: OverviewCardEntryStatus
  label: ReactNode
  onClick: Nullable<() => void>
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <OverviewCardEntrySC
      {...(status === 'success' ? { tertiary: true } : { secondary: true })}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      endIcon={
        isHovered || status !== 'success' ? (
          <ArrowRightIcon
            color={status === 'success' ? 'text-xlight' : 'text'}
          />
        ) : undefined
      }
    >
      <Flex gap="small">
        {status === 'success' ? (
          <CheckRoundedIcon
            size={20}
            color="icon-success"
          />
        ) : status === 'warning' ? (
          <WarningIcon
            size={20}
            color="icon-warning"
          />
        ) : (
          <StatusIpIcon size={20} />
        )}
        <Body2P $color={status === 'success' ? 'text-xlight' : 'text'}>
          {label}
        </Body2P>
      </Flex>
    </OverviewCardEntrySC>
  )
}

const OverviewCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  flex: 1,
}))

const OverviewCardEntrySC = styled(Button)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing.small,
  width: '100%',
}))
