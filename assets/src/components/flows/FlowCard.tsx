import {
  AppIcon,
  ArrowRightIcon,
  Card,
  Chip,
  Flex,
  FlowIcon,
  GitPullIcon,
  IconFrame,
  PeopleIcon,
} from '@pluralsh/design-system'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import pluralize from 'pluralize'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

export function FlowCard({
  flow,
  refetch,
}: {
  flow: FlowBasicWithBindingsFragment
  refetch: () => void
}) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const numAlerts = flow.alerts?.edges?.length ?? 0
  return (
    <>
      <CardSC
        forwardedAs={Link}
        to={flow.name}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <ContentSC>
          <Flex
            gap="xsmall"
            align="center"
          >
            <AppIcon
              size="xxsmall"
              url={flow.icon ?? ''}
              icon={<FlowIcon />}
              css={{ borderRadius: '50%' }}
            />
            <Body1BoldP>{flow.name}</Body1BoldP>
          </Flex>
          <Body2P $color="text-light">{flow.description}</Body2P>
          <Chip
            inactive={numAlerts === 0}
            severity="danger"
            size="small"
            css={{ width: 'fit-content' }}
          >
            {numAlerts}
            {pluralize(' alert', numAlerts)}
          </Chip>
        </ContentSC>
        <FooterSC $parentHover={hovered}>
          <Flex gap="xsmall">
            <IconFrame
              clickable
              tooltip="Permissions"
              onClick={(e) => {
                e.stopPropagation()
                setShowPermissions(!showPermissions)
              }}
              icon={<PeopleIcon color="icon-light" />}
            />
            <IconFrame
              clickable
              tooltip="View pipelines for this flow"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`${flow.id}/pipelines`)
              }}
              icon={<GitPullIcon color="icon-light" />}
            />
          </Flex>

          <ArrowRightIcon color="icon-light" />
        </FooterSC>
      </CardSC>
      <PermissionsModal
        id={flow.id}
        type={PermissionsIdType.Flow}
        bindings={flow}
        header="Flow permissions"
        refetch={refetch}
        open={showPermissions}
        onClose={() => setShowPermissions(false)}
      />
    </>
  )
}
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
    borderTop: theme.borders['fill-two'],
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors['fill-one']
        : theme.colors['fill-two'],
    ...($parentHover && {
      '&:not(:has(button:hover))': {
        backgroundColor:
          theme.mode === 'light'
            ? theme.colors['fill-one-hover']
            : theme.colors['fill-two-hover'],
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
  backgroundColor:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-one'],
  '&:hover:not(:has(button:hover))': {
    backgroundColor:
      theme.mode === 'light'
        ? theme.colors['fill-zero-hover']
        : theme.colors['fill-one-hover'],
  },
}))
