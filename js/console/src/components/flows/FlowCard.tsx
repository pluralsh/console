import {
  AppIcon,
  ArrowRightIcon,
  Card,
  Flex,
  FlowIcon,
} from '@pluralsh/design-system'
import { FlowActionsMenu } from 'components/flows/FlowActionsMenu'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import { FlowInsightIcon } from 'components/flows/FlowInsightIcon'
import {
  FlowAlertChip,
  FlowHealthChips,
  FlowPipelineChip,
  componentHealthCounts,
  getFlowTabPath,
} from 'components/flows/flowHealth'
import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'

export function FlowCard({
  flow,
  refetch,
  favorited,
  onToggleFavorite,
}: {
  flow: FlowBasicWithBindingsFragment
  refetch: () => void
  favorited: boolean
  onToggleFavorite: () => void
}) {
  const { search } = useLocation()
  const [hovered, setHovered] = useState(false)
  const serviceCount = flow.serviceCount ?? 0
  const componentCount = flow.componentCount ?? 0
  const componentCounts = componentHealthCounts(flow.componentStatuses)
  const flowPath = getFlowDetailsPath({ flowIdOrName: flow.name })

  return (
    <CardSC
      fillLevel={1}
      forwardedAs={Link}
      to={`${flowPath}/services${search}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ContentSC>
        <HeaderSC>
          <AppIcon
            rounded
            size="xsmall"
            url={flow.icon || undefined}
            icon={<FlowIcon />}
          />
          <Body1BoldP
            css={{
              flex: 1,
              minWidth: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {flow.name}
          </Body1BoldP>
          <FlowInsightIcon insight={flow.insight} />
        </HeaderSC>
        <MetaSC>
          <span>
            <MetaLabelSC>Components</MetaLabelSC> {componentCount}
          </span>
          <span>
            <MetaLabelSC>Services</MetaLabelSC> {serviceCount}
          </span>
        </MetaSC>
        {flow.description && (
          <Body2P
            $color="text-light"
            css={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {flow.description}
          </Body2P>
        )}
        <MetricsSC>
          <MetricGroupSC>
            <CaptionP
              $color="text-xlight"
              css={{ margin: 0 }}
            >
              Components
            </CaptionP>
            <FlowHealthChips
              counts={componentCounts}
              getTo={(bucket) =>
                getFlowTabPath({
                  flowName: flow.name,
                  tab: 'services',
                  search,
                  component: bucket,
                })
              }
            />
          </MetricGroupSC>
          <MetricGroupSC>
            <CaptionP
              $color="text-xlight"
              css={{ margin: 0 }}
            >
              Alerts
            </CaptionP>
            <FlowAlertChip
              count={flow.alertCount ?? 0}
              to={getFlowTabPath({
                flowName: flow.name,
                tab: 'alerts',
                search,
              })}
            />
          </MetricGroupSC>
          <MetricGroupSC>
            <CaptionP
              $color="text-xlight"
              css={{ margin: 0 }}
            >
              Pipelines
            </CaptionP>
            <FlowPipelineChip
              pipelineCount={flow.pipelineCount ?? 0}
              pendingCount={flow.pendingPipelineCount ?? 0}
              to={getFlowTabPath({
                flowName: flow.name,
                tab: 'pipelines',
                search,
              })}
            />
          </MetricGroupSC>
        </MetricsSC>
      </ContentSC>
      <FooterSC $parentHover={hovered}>
        <Flex
          gap="xsmall"
          align="center"
        >
          <FlowActionsMenu
            flow={flow}
            search={search}
            refetch={refetch}
            favorited={favorited}
            onToggleFavorite={onToggleFavorite}
          />
          <FlowFavoriteButton
            favorited={favorited}
            onToggle={onToggleFavorite}
          />
        </Flex>
        <ArrowRightIcon color="icon-light" />
      </FooterSC>
    </CardSC>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: '100%',
}))

const MetaSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

const MetaLabelSC = styled.span(({ theme }) => ({
  color: theme.colors['text-input-disabled'],
}))

const MetricsSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  width: '100%',
  flexWrap: 'wrap',
}))

const MetricGroupSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
}))

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  padding: theme.spacing.medium,
  gap: theme.spacing.small,
}))

const FooterSC = styled.div<{ $parentHover: boolean }>(
  ({ $parentHover, theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    borderTop: theme.borders.default,
    ...($parentHover && {
      '&:not(:has(button:hover))': {
        backgroundColor: theme.colors['fill-one-hover'],
        borderTopColor: theme.colors['border-fill-one'],
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
