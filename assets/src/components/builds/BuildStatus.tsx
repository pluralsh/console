import { Box, Text } from 'grommet'
import { createElement } from 'react'

import { BeatLoader } from 'react-spinners'
import { Check } from 'forge-core'

import { Close, StatusCritical } from 'grommet-icons'

import { BuildStatus as Status } from '../types'

function IconStatus({ icon, background }) {
  return (
    <Box
      flex={false}
      round="full"
      width="30px"
      height="30px"
      align="center"
      justify="center"
      background={background}
    >
      {createElement(icon, { size: '16px' })}
    </Box>
  )
}

function BuildStatusInner({ background, text, icon }) {
  return (
    <Box
      flex={false}
      direction="row"
      justify="center"
      align="center"
      pad={{ horizontal: 'small', vertical: 'xsmall' }}
      round="xxsmall"
      background={background}
    >
      {icon && <Box width="50px">{icon}</Box>}
      <Text
        size="small"
        weight={500}
      >{text}
      </Text>
    </Box>
  )
}

export default function BuildStatus({ status }) {
  switch (status) {
  case Status.QUEUED:
    return (
      <BuildStatusInner
        background="status-unknown"
        text="queued"
        icon={undefined}
      />
    )
  case Status.CANCELLED:
    return (
      <IconStatus
        icon={Close}
        background="tone-medium"
      />
    )
  case Status.RUNNING:
    return (
      <BuildStatusInner
        icon={(
          <BeatLoader
            size={5}
            margin={2}
            color="white"
          />
        )}
        background="progress"
        text="running"
      />
    )
  case Status.FAILED:
    return (
      <IconStatus
        icon={StatusCritical}
        background="error"
      />
    )
  case Status.SUCCESSFUL:
    return (
      <IconStatus
        icon={Check}
        background="success"
      />
    )
  case Status.PENDING:
    return (
      <BuildStatusInner
        background="status-warning"
        text="pending approval"
        icon={undefined}
      />
    )
  default:
    return null
  }
}
