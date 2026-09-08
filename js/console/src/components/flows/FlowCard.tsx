import {
  AiSparkleOutlineIcon,
  AppIcon,
  ArrowRightIcon,
  Card,
  IconFrame,
} from '@pluralsh/design-system'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { Body2P } from 'components/utils/typography/Text'
import { hasAccess } from 'components/utils/persona'
import { FlowCardFragment, ServiceDeploymentStatus } from 'generated/graphql'
import pluralize from 'pluralize'
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import styled from 'styled-components'

type FlowServiceStatusCounts = {
  healthy: number
  stale: number
  failed: number
  total: number
}

const emptyFlowServiceStatusCounts: FlowServiceStatusCounts = {
  healthy: 0,
  stale: 0,
  failed: 0,
  total: 0,
}

const FLOW_HEALTH_STALE_COLOR = '#FFF170'

export function FlowCard({
  flow,
  refetch,
}: {
  flow: FlowCardFragment
  refetch: () => void
}) {
  const { search } = useLocation()
  const { personaConfiguration } = useLogin()
  const showPermissionsBtn = hasAccess(
    personaConfiguration,
    'flows.permissions'
  )
  const showPipelines = hasAccess(personaConfiguration, 'flows.pipelines')
  const [hovered, setHovered] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const numAlerts = flow.alerts?.edges?.length ?? 0
  const services = useMemo(
    () => mapExistingNodes(flow.services),
    [flow.services]
  )
  const pipelines = useMemo(
    () => mapExistingNodes(flow.pipelines),
    [flow.pipelines]
  )
  const serviceStatusCounts = useMemo(
    () => getFlowServiceStatusCounts(services),
    [services]
  )
  const numStoppedPipelines = useMemo(
    () => getStoppedPipelineCount(pipelines),
    [pipelines]
  )
  const flowPath = getFlowDetailsPath({ flowIdOrName: flow.name })
  return (
    <>
      <CardSC
        fillLevel={1}
        forwardedAs={Link}
        to={`${flowPath}/services${search}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ContentSC>
          <FlowDetailsSC>
            <FlowHeaderSC>
              <FlowAppIcon
                iconUrl={flow.icon}
                name={flow.name}
              />
              <FlowNameSC>{flow.name}</FlowNameSC>
              {showPermissionsBtn && (
                <IconFrame
                  clickable
                  textValue="Permissions"
                  tooltip="Permissions"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowPermissions(!showPermissions)
                  }}
                  icon={<AiSparkleOutlineIcon color="icon-light" />}
                />
              )}
            </FlowHeaderSC>
            <FlowDescriptionSC $color="text-light">
              {flow.description}
            </FlowDescriptionSC>
          </FlowDetailsSC>
          <FlowMetricsSC>
            <FlowHealthMetrics counts={serviceStatusCounts} />
            <FlowServicesMetric count={serviceStatusCounts.total} />
          </FlowMetricsSC>
        </ContentSC>
        <FooterSC $parentHover={hovered}>
          <FooterContentSC>
            <FooterTagsSC>
              <FlowAlertStatusChip count={numAlerts} />
              {showPipelines && (
                <FlowPipelineStatusChip count={numStoppedPipelines} />
              )}
            </FooterTagsSC>
          </FooterContentSC>
          <FooterChevronSC>
            <ArrowRightIcon color="icon-light" />
          </FooterChevronSC>
        </FooterSC>
      </CardSC>
      {showPermissionsBtn && (
        <PermissionsModal
          id={flow.id}
          type={PermissionsIdType.Flow}
          bindings={flow}
          header="Flow permissions"
          refetch={refetch}
          open={showPermissions}
          onClose={() => setShowPermissions(false)}
        />
      )}
    </>
  )
}

function FlowAlertStatusChip({ count }: { count: number }) {
  return (
    <FlowFooterChipSC
      $gap={8}
      aria-label={`${count}${pluralize(' alert', count)}`}
    >
      <FlowFooterChipTextSC
        $colorKey={count ? 'text-danger-light' : 'text-xlight'}
        $letterSpacing={0.5}
      >
        {count}
        {pluralize(' alert', count)}
      </FlowFooterChipTextSC>
    </FlowFooterChipSC>
  )
}

function FlowAppIcon({
  iconUrl,
  name,
}: {
  iconUrl?: string | null
  name: string
}) {
  if (iconUrl) {
    return (
      <AppIcon
        rounded
        size="xsmall"
        url={iconUrl}
        alt={`${name} icon`}
      />
    )
  }

  return <FlowAppIconFallbackSC>{getFlowInitials(name)}</FlowAppIconFallbackSC>
}

function getFlowInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (!parts.length) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function FlowPipelineStatusChip({ count }: { count: number }) {
  return (
    <FlowFooterChipSC
      $gap={4}
      aria-label={`${count} stopped pipelines`}
    >
      <FlowFooterChipTextSC $colorKey="text-long-form">
        Pipelines
      </FlowFooterChipTextSC>
      <FlowFooterChipTextSC
        $colorKey={count ? 'text-danger-light' : 'text-xlight'}
      >
        {count} stopped
      </FlowFooterChipTextSC>
    </FlowFooterChipSC>
  )
}

function getFlowServiceStatusCounts(
  services: { status?: ServiceDeploymentStatus | null }[]
): FlowServiceStatusCounts {
  return services.reduce<FlowServiceStatusCounts>(
    (counts, service) => {
      switch (service.status) {
        case ServiceDeploymentStatus.Healthy:
        case ServiceDeploymentStatus.Synced:
          counts.healthy += 1
          break
        case ServiceDeploymentStatus.Stale:
        case ServiceDeploymentStatus.Paused:
          counts.stale += 1
          break
        case ServiceDeploymentStatus.Failed:
          counts.failed += 1
          break
      }
      counts.total += 1
      return counts
    },
    { ...emptyFlowServiceStatusCounts }
  )
}

function getPercentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0
}

function getStoppedPipelineCount(
  pipelines: { status?: { closed?: number | null } | null }[]
) {
  return pipelines.filter((pipeline) => (pipeline.status?.closed ?? 0) > 0)
    .length
}

function getDegrees(numerator: number, denominator: number) {
  return denominator ? (numerator / denominator) * 360 : 0
}

function FlowHealthMetrics({ counts }: { counts: FlowServiceStatusCounts }) {
  return (
    <FlowHealthMetricsSC>
      <FlowHealthDonut counts={counts} />
      <FlowHealthLegend counts={counts} />
    </FlowHealthMetricsSC>
  )
}

function FlowServicesMetric({ count }: { count: number }) {
  return (
    <FlowMetricCardSC>
      <FlowMetricContentSC>
        <FlowMetricValueSC>{count}</FlowMetricValueSC>
        <FlowMetricLabelSC>Services</FlowMetricLabelSC>
      </FlowMetricContentSC>
    </FlowMetricCardSC>
  )
}

function FlowHealthDonut({ counts }: { counts: FlowServiceStatusCounts }) {
  const healthyPercentage = getPercentage(counts.healthy, counts.total)

  return (
    <DonutChartSC
      role="img"
      aria-label={`${healthyPercentage}% healthy services`}
    >
      <DonutRingSC $counts={counts} />
      <DonutLabelSC>{healthyPercentage}%</DonutLabelSC>
    </DonutChartSC>
  )
}

function FlowHealthLegend({ counts }: { counts: FlowServiceStatusCounts }) {
  return (
    <FlowHealthLegendSC aria-label="Component status counts">
      <FlowHealthLegendTitleSC>Components</FlowHealthLegendTitleSC>
      <FlowHealthLegendRow
        colorKey="graph-green"
        count={counts.healthy}
        label="healthy"
      />
      <FlowHealthLegendRow
        color={FLOW_HEALTH_STALE_COLOR}
        count={counts.stale}
        label="stale"
      />
      {counts.failed > 0 && (
        <FlowHealthLegendRow
          colorKey="text-danger-light"
          count={counts.failed}
          label="failed"
        />
      )}
    </FlowHealthLegendSC>
  )
}

function FlowHealthLegendRow({
  color,
  colorKey,
  count,
  label,
}: {
  color?: string
  colorKey?: 'graph-green' | 'text-danger-light'
  count: number
  label: string
}) {
  return (
    <FlowHealthLegendItemSC>
      <FlowHealthLegendDotSC
        $color={color}
        $colorKey={colorKey}
      />
      <FlowHealthLegendTextSC
        $color={color}
        $colorKey={colorKey}
      >
        {count} {label}
      </FlowHealthLegendTextSC>
    </FlowHealthLegendItemSC>
  )
}

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  flex: 1,
  padding: theme.spacing.medium,
  gap: theme.spacing.small,
}))

const FlowDetailsSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  minWidth: 0,
  gap: 12,
})

const FlowHeaderSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  width: '100%',
  gap: 12,
  minWidth: 0,
})

const FlowAppIconFallbackSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
  width: 48,
  height: 48,
  padding: theme.spacing.xsmall,
  overflow: 'hidden',
  border: `1px solid ${theme.colors['border-input']}`,
  borderRadius: '50%',
  background: theme.colors['fill-two'],
  color: theme.colors['text-always-white'],
  fontFamily: 'Inter',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: 0.5,
  lineHeight: '16px',
  textAlign: 'center',
}))

const FlowNameSC = styled.p(({ theme }) => ({
  display: '-webkit-box',
  flex: '1 0 0',
  minWidth: 0,
  overflow: 'hidden',
  margin: 0,
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
  color: theme.colors.text,
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: 0.25,
  lineHeight: '24px',
}))

const FlowDescriptionSC = styled(Body2P)({
  display: '-webkit-box',
  alignSelf: 'stretch',
  height: 40,
  overflow: 'hidden',
  margin: 0,
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  wordBreak: 'break-word',
  textOverflow: 'ellipsis',
})

const FlowMetricsSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  alignSelf: 'stretch',
  justifyContent: 'flex-start',
  flexWrap: 'wrap',
  gap: 64,
})

const FlowHealthMetricsSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  flex: 'none',
  gap: 16,
})

const FlowMetricCardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: '1 1 132px',
  alignItems: 'center',
  justifyContent: 'flex-start',
  minWidth: 132,
  height: 96,
  padding: 24,
  borderRadius: 6,
  background: theme.colors['fill-one'],
}))

const FlowMetricContentSC = styled.div({
  display: 'flex',
  flex: '1 0 0',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  minHeight: 0,
  gap: 8,
})

const FlowMetricValueSC = styled.div(({ theme }) => ({
  color: theme.colors['icon-default'],
  fontFamily: "'Roboto Mono', monospace",
  fontSize: 20,
  fontWeight: 500,
  lineHeight: '24px',
  whiteSpace: 'nowrap',
}))

const FlowMetricLabelSC = styled.div(({ theme }) => ({
  color: theme.colors['text-xlight'],
  fontFamily: 'Inter',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: 0.5,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}))

const FlowFooterChipSC = styled.div<{ $gap: number }>(({ $gap, theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  width: 'fit-content',
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
  gap: $gap,
  border: `0.75px solid ${theme.colors['border-fill-two']}`,
  borderRadius: 3,
  background: theme.colors['fill-two'],
  whiteSpace: 'nowrap',
}))

const FlowFooterChipTextSC = styled.span<{
  $colorKey: 'text-long-form' | 'text-danger-light' | 'text-xlight'
  $letterSpacing?: number
}>(({ $colorKey, $letterSpacing, theme }) => ({
  color: theme.colors[$colorKey],
  fontFamily: 'Inter',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: $letterSpacing,
  lineHeight: '16px',
}))

const DonutChartSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  flex: 'none',
  width: 80,
  height: 80,
  padding: 4,
  borderRadius: '50%',
  background: theme.colors['border-fill-two'],
}))

const DonutRingSC = styled.div<{ $counts: FlowServiceStatusCounts }>(
  ({ $counts, theme }) => {
    const failedDegrees = getDegrees($counts.failed, $counts.total)
    const staleDegrees = getDegrees($counts.stale, $counts.total)
    const failedEnd = failedDegrees
    const staleEnd = failedEnd + staleDegrees

    return {
      position: 'relative',
      width: 72,
      height: 72,
      borderRadius: '50%',
      background: $counts.total
        ? `conic-gradient(
            from -90deg,
            ${theme.colors['text-danger-light']} 0deg ${failedEnd}deg,
            ${FLOW_HEALTH_STALE_COLOR} ${failedEnd}deg ${staleEnd}deg,
            ${theme.colors['graph-green']} ${staleEnd}deg 360deg
          )`
        : theme.colors['fill-three'],
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 10,
        borderRadius: '50%',
        background: theme.colors['fill-one'],
      },
    }
  }
)

const DonutLabelSC = styled.div(({ theme }) => ({
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  inset: 0,
  color: theme.colors.text,
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 'normal',
}))

const FlowHealthLegendSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 6,
  color: theme.colors['text-long-form'],
}))

const FlowHealthLegendTitleSC = styled.div(({ theme }) => ({
  color: theme.colors['text-long-form'],
  fontFamily: 'Inter',
  fontSize: 10,
  fontWeight: 400,
  lineHeight: '16px',
  whiteSpace: 'nowrap',
}))

const FlowHealthLegendItemSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
})

const FlowHealthLegendDotSC = styled.div<{
  $color?: string
  $colorKey?: 'graph-green' | 'text-danger-light'
}>(({ $color, $colorKey, theme }) => ({
  flex: 'none',
  width: 4,
  height: 4,
  borderRadius: '50%',
  background:
    $color ?? ($colorKey ? theme.colors[$colorKey] : theme.colors.text),
}))

const FlowHealthLegendTextSC = styled.div<{
  $color?: string
  $colorKey?: 'graph-green' | 'text-danger-light'
}>(({ $color, $colorKey, theme }) => ({
  color: $color ?? ($colorKey ? theme.colors[$colorKey] : theme.colors.text),
  fontFamily: 'Inter',
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 'normal',
  whiteSpace: 'nowrap',
}))

const FooterContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  flex: '1 0 0',
  minWidth: 0,
  gap: theme.spacing.xsmall,
}))

const FooterTagsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: theme.spacing.xsmall,
}))

const FooterChevronSC = styled.div({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  alignSelf: 'stretch',
  flex: 'none',
  padding: '4px 16px',
  borderRadius: 3,
})

const FooterSC = styled.div<{ $parentHover: boolean }>(
  ({ $parentHover, theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '12px 16px',
    borderTop: theme.borders['fill-two'],
    background: theme.colors['fill-one'],
    ...($parentHover && {
      '&:not(:has(button:hover))': {
        backgroundColor: theme.colors['fill-one-hover'],
        borderTopColor: theme.colors['border-fill-two'],
      },
    }),
  })
)

const CardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  overflow: 'hidden',
  cursor: 'pointer',
  textDecoration: 'none',
  '&:hover:not(:has(button:hover))': {
    backgroundColor: theme.colors['fill-one-hover'],
    borderColor: theme.colors['border-fill-one'],
  },
}))
