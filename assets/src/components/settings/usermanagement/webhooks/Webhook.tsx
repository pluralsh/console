import { useMutation } from '@apollo/client'
import { useState } from 'react'

import { formatDateTime } from 'utils/datetime'

import {
  Flex,
  IconFrame,
  SlackLogoIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'

import { TRUNCATE } from 'components/utils/truncate'

import { removeConnection, updateCache } from '../../../../utils/graphql'

import { DELETE_WEBHOOK, WEBHOOKS_Q } from '../../../graphql/webhooks'

import WebhookHealth from './WebhookHealth'
import { useTheme } from 'styled-components'
import { Body2P, CaptionP } from 'components/utils/typography/Text'

export default function Webhook({ hook: { id, url, health, insertedAt } }) {
  const { borders } = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [mutation, { loading }] = useMutation(DELETE_WEBHOOK, {
    variables: { id },
    update: (cache, { data: { deleteWebhook } }) =>
      updateCache(cache, {
        variables: {},
        query: WEBHOOKS_Q,
        update: (prev) => removeConnection(prev, deleteWebhook, 'webhooks'),
      }),
    onCompleted: () => setConfirm(false),
  })

  return (
    <>
      <Flex
        borderBottom={borders.default}
        gap="small"
        justify="center"
        padding="small"
      >
        <IconFrame
          icon={<SlackLogoIcon fullColor />}
          size="medium"
          textValue="Slack"
          type="floating"
        />
        <div css={{ flexGrow: 1, ...TRUNCATE }}>
          <Body2P css={{ fontWeight: 600, ...TRUNCATE }}>{url}</Body2P>
          <CaptionP $color="text-xlight">
            Created on {formatDateTime(insertedAt, 'DD/MM/YY')}
          </CaptionP>
        </div>
        <Flex
          direction="column"
          justify="center"
        >
          <WebhookHealth health={health} />
        </Flex>
        <Flex
          direction="column"
          justify="center"
        >
          <IconFrame
            size="medium"
            clickable
            icon={<TrashCanIcon color="icon-danger" />}
            textValue="Delete"
            tooltip
            onClick={() => setConfirm(true)}
          />
        </Flex>
      </Flex>
      <Confirm
        text="This will permanently delete this webhook"
        loading={loading}
        open={confirm}
        close={() => setConfirm(false)}
        submit={mutation}
        destructive
      />
    </>
  )
}
