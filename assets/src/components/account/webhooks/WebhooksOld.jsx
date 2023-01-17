import { useState } from 'react'
import { useMutation } from '@apollo/client'

import { Confirm, Trash } from 'forge-core'

import { Box, Text } from 'grommet'

import moment from 'moment'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { DELETE_WEBHOOK, WEBHOOKS_Q } from '../../graphql/webhooks'

import { Icon } from '../Icon'

function WebhookHealth({ health }) {
  const background = health === 'HEALTHY' ? 'success' : 'error'

  return (
    <Box
      background={background}
      justify="center"
      align="center"
      round="xsmall"
      pad={{ horizontal: 'medium', vertical: 'xsmall' }}
    >
      <Text size="small">{health.toLowerCase()}</Text>
    </Box>
  )
}

const HEIGHT_PX = '45px'
const HEALTH_WIDTH = '150px'

export function WebhookRow({
  hook: {
    id, url, health, insertedAt,
  },
}) {
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_WEBHOOK, {
    variables: { id },
    update: (cache, { data: { deleteWebhook } }) => updateCache(cache, {
      query: WEBHOOKS_Q,
      update: prev => removeConnection(prev, deleteWebhook, 'webhooks'),
    }),
    onCompleted: () => setConfirm(false),
  })

  return (
    <>
      <Box
        flex={false}
        height={HEIGHT_PX}
        direction="row"
        align="center"
        border={{ side: 'bottom' }}
        pad="small"
        gap="small"
      >
        <Box
          fill="horizontal"
          gap="small"
          align="center"
          direction="row"
        >
          {url}
          {moment(insertedAt).format('lll')}
        </Box>
        <Box
          width={HEALTH_WIDTH}
          flex={false}
          direction="row"
          align="center"
          gap="small"
        >
          <WebhookHealth health={health} />
          <Icon
            icon={Trash}
            onClick={() => setConfirm(true)}
            iconAttrs={{ color: 'error' }}
            tooltip="Delete"
          />
        </Box>
      </Box>
      {confirm && (
        <Confirm
          description="This will permanently delete this webhook"
          loading={loading}
          cancel={() => setConfirm(false)}
          submit={mutation}
        />
      )}
    </>
  )
}

