import {
  AppIcon,
  ArrowRightIcon,
  Button,
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
import { useNavigate } from 'react-router-dom'
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => navigate(flow.id)}
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
              type="secondary"
              tooltip="Permissions"
              onClick={(e) => {
                e.stopPropagation()
                setShowPermissions(!showPermissions)
              }}
              icon={<PeopleIcon />}
            />
            <IconFrame
              clickable
              type="secondary"
              tooltip="View pipelines for this flow"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`${flow.id}/pipelines`)
              }}
              icon={<GitPullIcon />}
            />
          </Flex>
          <Button
            small
            secondary
            endIcon={<ArrowRightIcon />}
          >
            Go to Flow
          </Button>
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
    backgroundColor: theme.colors['fill-two'],
    ...($parentHover && {
      '&:not(:has(button:hover))': {
        backgroundColor: theme.colors['fill-two-hover'],
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
  backgroundColor: theme.colors['fill-one'],
  '&:hover:not(:has(button:hover))': {
    backgroundColor: theme.colors['fill-one-hover'],
  },
}))
