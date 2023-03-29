import { useState } from 'react'
import { useMutation } from '@apollo/client'

import moment from 'moment'

import { Div, Flex, P } from 'honorable'

import { IconFrame, SlackLogoIcon, TrashCanIcon } from '@pluralsh/design-system'

import { Confirm } from 'components/utils/Confirm'

import { TRUNCATE } from 'components/utils/truncate'

import { removeConnection, updateCache } from '../../../utils/graphql'

import { DELETE_WEBHOOK, WEBHOOKS_Q } from '../../graphql/webhooks'

import WebhookHealth from './WebhookHealth'

export default function Webhook({ hook: { id, url, health, insertedAt } }) {
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
        borderBottom="1px solid border"
        gap="small"
        justify="center"
        padding="small"
      >
        <IconFrame
          icon={<SlackLogoIcon />}
          size="medium"
          textValue="Slack"
          type="floating"
          minWidth={32}
        />
        <Div
          flexGrow={1}
          {...TRUNCATE}
        >
          <P
            body2
            fontWeight={600}
            {...TRUNCATE}
          >
            {url}
          </P>
          <P
            caption
            color="text-xlight"
          >
            Created on {moment(insertedAt).format('DD/MM/YY')}
          </P>
        </Div>
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
            hue="lighter"
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
