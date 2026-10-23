import {
  Card,
  CaretRightIcon,
  Chip,
  ComponentsIcon,
  Flex,
  IconFrame,
} from '@pluralsh/design-system'
import { capitalize } from 'lodash'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { AiInsightSummaryIcon } from 'components/utils/AiInsights.tsx'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  ClusterInsightComponentFragment,
  InsightFreshness,
} from 'generated/graphql.ts'
import { fromNow } from 'utils/datetime'
import {
  ClusterInsightComponentLabel,
  ClusterInsightServiceChip,
  priorityToSeverity,
} from './ClusterInsightComponentParts.tsx'

export function ClusterInsightComponentCard({
  component,
}: {
  component: ClusterInsightComponentFragment
}) {
  const { insight, priority, service } = component
  const summary =
    insight?.freshness === InsightFreshness.Expired ? null : insight?.summary

  return (
    <CardSC fillLevel={1}>
      <CardLinkSC
        to={component.id}
        aria-label={`${component.namespace ? `${component.namespace} > ` : ''}${component.name} (${component.kind})`}
      />
      <ContentSC>
        <ClusterInsightComponentLabel
          truncate
          component={component}
          icon={
            <IconFrame
              size="medium"
              icon={<ComponentsIcon size={16} />}
            />
          }
        />
        {(priority || service) && (
          <Flex
            gap="xsmall"
            align="center"
            wrap="wrap"
          >
            {priority && (
              <Chip
                size="small"
                severity={priorityToSeverity(priority)}
              >
                {capitalize(priority)}
              </Chip>
            )}
            <ClusterInsightServiceChip service={service} />
          </Flex>
        )}
        <Body2P
          $color={summary ? 'text-light' : 'text-xlight'}
          css={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
            minHeight: '3lh',
          }}
        >
          {summary ?? 'No insight generated yet.'}
        </Body2P>
      </ContentSC>
      <FooterSC>
        <Flex
          gap="xsmall"
          align="center"
        >
          <AiInsightSummaryIcon
            noPadding
            insight={insight}
          />
          {insight?.updatedAt && (
            <CaptionP
              $color="text-xlight"
              css={{ margin: 0 }}
            >
              Updated {fromNow(insight.updatedAt)}
            </CaptionP>
          )}
        </Flex>
        <CaretRightIcon
          color="icon-xlight"
          size={16}
        />
      </FooterSC>
    </CardSC>
  )
}

const ContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
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
  [`& button, & a:not(${CardLinkSC})`]: {
    position: 'relative',
    zIndex: 1,
  },
  [`&:hover:not(:has(button:hover, a:not(${CardLinkSC}):hover))`]: {
    backgroundColor: theme.colors['fill-one-hover'],
    borderColor: theme.colors['border-fill-one'],
    [`${FooterSC}`]: {
      backgroundColor: theme.colors['fill-one-hover'],
      borderTopColor: theme.colors['border-fill-one'],
    },
  },
}))
