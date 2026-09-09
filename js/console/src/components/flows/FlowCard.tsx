import {
  AiSparkleOutlineIcon,
  AppIcon,
  ArrowRightIcon,
  Card,
  Chip,
  Flex,
  FlowIcon,
  GitPullIcon,
  ListBoxItem,
  PeopleIcon,
} from '@pluralsh/design-system'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import {
  FlowHealthChips,
  FlowPipelineChip,
  componentHealthCounts,
} from 'components/flows/flowHealth'
import { MoreMenu } from 'components/utils/MoreMenu'
import { Body1BoldP, Body2P, CaptionP } from 'components/utils/typography/Text'
import { hasAccess } from 'components/utils/persona'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import pluralize from 'pluralize'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { personaConfiguration } = useLogin()
  const showPermissionsBtn = hasAccess(
    personaConfiguration,
    'flows.permissions'
  )
  const showPipelines = hasAccess(personaConfiguration, 'flows.pipelines')
  const [hovered, setHovered] = useState(false)
  const [menuKey, setMenuKey] = useState('')
  const numAlerts = flow.alertCount ?? 0
  const serviceCount = flow.serviceCount ?? 0
  const componentCount = flow.componentCount ?? 0
  const componentCounts = componentHealthCounts(flow.componentStatuses)
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
          <HeaderSC>
            <AppIcon
              size="xsmall"
              url={flow.icon ?? ''}
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
            {flow.agentRuntime?.id && (
              <AiSparkleOutlineIcon
                size={13}
                color="icon-info"
              />
            )}
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
              <FlowHealthChips counts={componentCounts} />
            </MetricGroupSC>
            <MetricGroupSC>
              <CaptionP
                $color="text-xlight"
                css={{ margin: 0 }}
              >
                Alerts
              </CaptionP>
              <Chip
                inactive={numAlerts === 0}
                severity="danger"
                size="small"
                css={{ width: 'fit-content' }}
              >
                {numAlerts} {pluralize('alert', numAlerts)}
              </Chip>
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
              />
            </MetricGroupSC>
          </MetricsSC>
        </ContentSC>
        <FooterSC $parentHover={hovered}>
          <Flex
            gap="xsmall"
            align="center"
          >
            {(showPermissionsBtn || showPipelines) && (
              <MoreMenu
                onSelectionChange={(key: string) => {
                  if (key === 'pipelines') {
                    navigate(`${flowPath}/pipelines${search}`)
                    return
                  }
                  setMenuKey(key)
                }}
                triggerProps={{
                  onClick: (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  },
                }}
              >
                {showPermissionsBtn && (
                  <ListBoxItem
                    key="permissions"
                    label="Permissions"
                    leftContent={<PeopleIcon />}
                    textValue="Permissions"
                  />
                )}
                {showPipelines && (
                  <ListBoxItem
                    key="pipelines"
                    label="View pipelines"
                    leftContent={<GitPullIcon />}
                    textValue="View pipelines"
                  />
                )}
              </MoreMenu>
            )}
            <FlowFavoriteButton
              favorited={favorited}
              onToggle={onToggleFavorite}
            />
          </Flex>
          <ArrowRightIcon color="icon-light" />
        </FooterSC>
      </CardSC>
      {showPermissionsBtn && (
        <PermissionsModal
          id={flow.id}
          type={PermissionsIdType.Flow}
          bindings={flow}
          header="Flow permissions"
          refetch={refetch}
          open={menuKey === 'permissions'}
          onClose={() => setMenuKey('')}
        />
      )}
    </>
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
