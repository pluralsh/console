import {
  AppIcon,
  Card,
  CaretRightIcon,
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
  FlowTab,
  HealthBucket,
  componentHealthCounts,
  flowTabPath,
} from 'components/flows/flowHealth'
import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { Link, useLocation } from 'react-router-dom'
import styled from 'styled-components'

const LINE_CLAMP = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const

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
  const tab = (name: FlowTab, component?: HealthBucket) =>
    flowTabPath(flow.name, name, search, component)

  return (
    <CardSC fillLevel={1}>
      <CardLinkSC
        to={tab('services')}
        aria-label={flow.name}
      />
      <ContentSC>
        <HeaderSC>
          <CardAppIconSC
            rounded
            size="xsmall"
            url={flow.icon || undefined}
            icon={<FlowIcon size={20} />}
          />
          <Body1BoldP css={{ flex: 1, minWidth: 0, ...LINE_CLAMP }}>
            {flow.name}
          </Body1BoldP>
          <FlowInsightIcon insight={flow.insight} />
        </HeaderSC>
        <MetaSC>
          <span>
            <MetaLabelSC>Components</MetaLabelSC> {flow.componentCount ?? 0}
          </span>
          <span>
            <MetaLabelSC>Services</MetaLabelSC> {flow.serviceCount ?? 0}
          </span>
        </MetaSC>
        {flow.description && (
          <Body2P
            $color="text-light"
            css={LINE_CLAMP}
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
              counts={componentHealthCounts(flow.componentStatuses)}
              getTo={(bucket) => tab('services', bucket)}
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
              to={tab('alerts')}
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
              to={tab('pipelines')}
            />
          </MetricGroupSC>
        </MetricsSC>
      </ContentSC>
      <FooterSC>
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
        <CaretRightIcon
          color="icon-xlight"
          size={16}
        />
      </FooterSC>
    </CardSC>
  )
}

const CardAppIconSC = styled(AppIcon)({
  '& img, & svg': {
    width: 20,
    height: 20,
  },
})

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

const FooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  borderTop: theme.borders.default,
}))

const CardLinkSC = styled(Link)({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
})

const CardSC = styled(Card)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  overflow: 'hidden',
  cursor: 'pointer',
  textDecoration: 'none',
  '& button': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover:not(:has(button:hover))': {
    backgroundColor: theme.colors['fill-one-hover'],
    borderColor: theme.colors['border-fill-one'],
    [`${FooterSC}`]: {
      backgroundColor: theme.colors['fill-one-hover'],
      borderTopColor: theme.colors['border-fill-one'],
    },
  },
}))
