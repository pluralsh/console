import {
  AppIcon,
  CaretRightIcon,
  Chip,
  InstallIcon,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import { getIcon, hasIcons } from 'components/apps/misc'
import { InstallationContext } from 'components/Installations'
import { BuildTypes } from 'components/types'
import { Flex, P } from 'honorable'
import moment from 'moment'
import { useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { TooltipTime } from 'components/utils/TooltipTime'

import BuildStatus from './BuildStatus'

export const BUILD_TYPE_DISPLAY_NAMES = {
  [BuildTypes.BOUNCE]: 'Bounce',
  [BuildTypes.DEDICATED]: 'Dedicated',
  [BuildTypes.DEPLOY]: 'Deployment',
  [BuildTypes.APPROVAL]: 'New images',
  [BuildTypes.INSTALL]: 'Installation',
}
const TimeFromNow = styled(TooltipTime).attrs(() => ({ forwardedAs: 'p' }))(
  (_) => ({
    whiteSpace: 'nowrap',
  })
)

export default function Build({ build }) {
  const theme = useTheme()
  const { id, repository, status, insertedAt, message, type } = build
  const navigate = useNavigate()
  const { applications } = useContext<any>(InstallationContext)
  const app = useMemo(
    () => applications?.find((app) => app.name === repository),
    [applications, repository]
  )

  return (
    <Flex
      borderBottom="1px solid border"
      gap="small"
      padding="medium"
      cursor="pointer"
      _hover={{ backgroundColor: 'fill-one-hover' }}
      onClick={() => navigate(`/builds/${id}`)}
    >
      {app && hasIcons(app) && (
        <AppIcon
          url={getIcon(app, theme.mode)}
          size="xsmall"
        />
      )}
      {!app && (
        <AppIcon
          icon={<InstallIcon />}
          size="xsmall"
        />
      )}
      <Flex direction="column">
        <Flex gap="small">
          <P
            body1
            fontWeight={600}
          >
            {repository}
          </P>
          <Chip
            size="small"
            whiteSpace="nowrap"
          >
            {BUILD_TYPE_DISPLAY_NAMES[type] || type}
          </Chip>
        </Flex>
        {message}
      </Flex>
      <Flex
        caption
        color="text-xlight"
        gap="medium"
        grow={1}
        align="center"
        justify="end"
      >
        <TimeFromNow dateString={insertedAt}>
          {moment(insertedAt).fromNow()}
        </TimeFromNow>
        <BuildStatus status={status} />
        <CaretRightIcon />
      </Flex>
    </Flex>
  )
}
