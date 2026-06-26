import {
  Card,
  Divider,
  EmptyState,
  Flex,
  ProgressBar,
} from '@pluralsh/design-system'
import {
  Body1P,
  Body2BoldP,
  Body2P,
  CaptionP,
  OverlineH1,
  Title1H1,
} from 'components/utils/typography/Text'
import { WorkbenchJobUsageFragment } from 'generated/graphql'
import { DefaultTheme, useTheme } from 'styled-components'
import { formatTokenCost, formatTokenCount } from '../../common/workbenchUsage'
import { useMemo } from 'react'

export function WorkbenchJobUsage({
  usage,
}: {
  usage?: Nullable<WorkbenchJobUsageFragment>
}) {
  const theme = useTheme()

  const hasUsage =
    usage &&
    Object.values(usage).some(
      (value) => typeof value === 'number' && Number.isFinite(value)
    )

  if (!hasUsage) {
    return <EmptyState message="No usage data reported for this job." />
  }

  return (
    <>
      <Body1P $color="text-long-form">
        Token consumption and estimated cost for this job.
      </Body1P>
      <Flex
        direction="column"
        gap="large"
      >
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(160px, 1fr))`,
            gap: theme.spacing.medium,
          }}
        >
          <UsageMetricCard
            label="Input tokens"
            value={formatTokenCount(usage?.inputTokens)}
            footer={
              usage?.inputTokens
                ? new Intl.NumberFormat('en-US').format(usage.inputTokens)
                : undefined
            }
          />
          <UsageMetricCard
            label="Output tokens"
            value={formatTokenCount(usage?.outputTokens)}
            footer={
              usage?.outputTokens
                ? new Intl.NumberFormat('en-US').format(usage.outputTokens)
                : undefined
            }
          />
          <UsageMetricCard
            label="Est cost"
            value={formatTokenCost(usage?.totalCost)}
          />
        </div>
        <TokenBreakdown usage={usage} />
        <CostBreakdown usage={usage} />
      </Flex>
    </>
  )
}

function TokenBreakdown({
  usage,
}: {
  usage?: Nullable<WorkbenchJobUsageFragment>
}) {
  const theme = useTheme()

  const hasAnyTokens =
    usage?.inputTokens != null ||
    usage?.outputTokens != null ||
    usage?.cachedTokens != null ||
    usage?.reasoningTokens != null

  const rows = useMemo(() => deriveTokenRows(usage, theme), [usage, theme])
  const derivedTotalTokens = rows.reduce((sum, row) => sum + row.value, 0)
  const totalTokens =
    usage?.totalTokens && usage.totalTokens > 0
      ? usage.totalTokens
      : Math.max(derivedTotalTokens, 1)

  if (!hasAnyTokens) {
    return (
      <Card>
        <EmptyState message="Token usage is not available for this job." />
      </Card>
    )
  }

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xxsmall,
        padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
        backgroundColor: theme.colors['fill-zero-selected'],
      }}
    >
      <Flex
        gap="xsmall"
        width="100%"
        justifyContent="space-between"
        alignItems="center"
      >
        <Body1P>Token breakdown</Body1P>
        <CaptionP $color="text-xlight">
          {new Intl.NumberFormat('en-US').format(totalTokens)} tokens total
        </CaptionP>
      </Flex>
      <Flex
        direction="column"
        gap="large"
        paddingTop={theme.spacing.large}
      >
        {rows.map((row) => (
          <Flex
            gap="xsmall"
            direction="column"
            key={row.id}
          >
            <Flex gap="xsmall">
              <Flex
                justifyItems="space-between"
                gap="xsmall"
                width="100%"
              >
                <CaptionP
                  $color="text-light"
                  css={{
                    fontFamily: theme.fontFamilies.mono,
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.name}
                </CaptionP>
                {row.extras && (
                  <CaptionP
                    $color="text-input-disabled"
                    css={{
                      fontFamily: theme.fontFamilies.mono,
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.extras}
                  </CaptionP>
                )}
              </Flex>
              <CaptionP
                $color="text"
                css={{
                  fontFamily: theme.fontFamilies.mono,
                }}
              >
                {formatTokenCount(row.value)}
              </CaptionP>
            </Flex>
            <ProgressBar
              css={{ gridColumn: '1 / -1', marginTop: 0 }}
              height={8}
              mode="determinate"
              progress={Math.min(row.value / totalTokens, 1)}
              progressColor={row.color}
              completeColor={row.color}
            />
          </Flex>
        ))}
      </Flex>
    </Card>
  )
}

function CostBreakdown({
  usage,
}: {
  usage?: Nullable<WorkbenchJobUsageFragment>
}) {
  const theme = useTheme()

  const hasAnyCost =
    usage?.inputCost != null ||
    usage?.outputCost != null ||
    usage?.totalCost != null

  if (!hasAnyCost) {
    return (
      <Card>
        <EmptyState message="Cost cannot be estimated for this job. Token usage is still available." />
      </Card>
    )
  }

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xsmall,
        padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
        backgroundColor: theme.colors['fill-zero-selected'],
      }}
    >
      <Body1P>Cost breakdown</Body1P>
      <Flex
        direction="column"
        gap="small"
        paddingTop={theme.spacing.small}
      >
        <Flex
          width="100%"
          gap="xsmall"
          justifyContent="space-between"
          alignItems="center"
        >
          <Body2P $color="text-light">Input cost</Body2P>
          <Body2P>{formatTokenCost(usage?.inputCost)}</Body2P>
        </Flex>
        <Divider backgroundColor="border" />
        <Flex
          width="100%"
          gap="xsmall"
          justifyContent="space-between"
          alignItems="center"
        >
          <Body2P $color="text-light">Output cost</Body2P>
          <Body2P>{formatTokenCost(usage?.outputCost)}</Body2P>
        </Flex>
        <Divider backgroundColor="border" />
        <Flex
          width="100%"
          gap="xsmall"
          justifyContent="space-between"
          alignItems="center"
        >
          <Body2BoldP>Total cost</Body2BoldP>
          <Body2BoldP>{formatTokenCost(usage?.totalCost)}</Body2BoldP>
        </Flex>
        <CaptionP
          $color="text-long-form"
          css={{
            paddingTop: theme.spacing.small,
          }}
        >
          Estimated using the configured provider price book. Cached tokens are
          billed at the input rate with a cache discount applied.
        </CaptionP>
      </Flex>
    </Card>
  )
}

function UsageMetricCard({
  label,
  value,
  footer,
}: {
  label: string
  value?: string
  footer?: string | null
}) {
  const theme = useTheme()

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xxsmall,
        padding: theme.spacing.large,
        backgroundColor: theme.colors['fill-zero-selected'],
      }}
    >
      <OverlineH1 $color="text-xlight">{label}</OverlineH1>
      <Title1H1 css={{ fontSize: theme.partials.text.h4.fontSize }}>
        {value ?? '--'}
      </Title1H1>
      <CaptionP $color="text-xlight">{footer}</CaptionP>
    </Card>
  )
}

type BreakdownRow = {
  id: string
  name: string
  extras?: string
  value: number
  color: string
}

function deriveTokenRows(
  usage: Nullable<WorkbenchJobUsageFragment>,
  theme: DefaultTheme
): Array<BreakdownRow> {
  const cachedTokensPercentage =
    ((usage?.cachedTokens ?? 0) / Math.max(usage?.inputTokens ?? 1, 1)) * 100

  return [
    {
      id: 'input-tokens',
      name: 'Input tokens',
      value: usage?.inputTokens ?? -1,
      color: theme.colors['graph-blue'],
    },
    {
      id: 'output-tokens',
      name: 'Output tokens',
      value: usage?.outputTokens ?? -1,
      color: theme.colors['graph-green'],
    },
    {
      id: 'cached-tokens',
      name: 'Cached tokens',
      extras:
        cachedTokensPercentage > 0
          ? `${cachedTokensPercentage.toFixed(0)}% of input`
          : undefined,
      value: usage?.cachedTokens ?? -1,
      color: theme.colors['graph-lilac'],
    },
    {
      id: 'reasoning-tokens',
      name: 'Reasoning tokens',
      extras: 'incl. in output',
      value: usage?.reasoningTokens ?? -1,
      color: theme.colors['graph-red'],
    },
  ].filter((row) => row.value > -1)
}
