import {
  Button,
  FormField,
  Input,
  Modal,
} from '@pluralsh/design-system'
import { useState } from 'react'
import { appendConnection, updateCache } from 'utils/graphql'
import { useMutation } from '@apollo/client'
import { CREATE_WEBHOOK, WEBHOOKS_Q } from 'components/graphql/webhooks'
import isEmpty from 'lodash/isEmpty'

export default function WebhookCreate() {
  const [open, setOpen] = useState<boolean>(false)
  const [attributes, setAttributes] = useState({ url: '' })
  const [mutation, { loading }] = useMutation(CREATE_WEBHOOK, {
    variables: { attributes },
    update: (cache, { data: { createWebhook } }) => updateCache(cache, {
      variables: {},
      query: WEBHOOKS_Q,
      update: prev => appendConnection(prev, createWebhook, 'webhooks'),
    }),
    onCompleted: () => setOpen(false),
  })

  return (
    <>
      <div>
        <Button
          small
          onClick={() => setOpen(true)}
        >
          Add Slack webhook
        </Button>
      </div>
      <Modal
        size="large"
        header="Create webhook"
        open={open}
        onClose={() => setOpen(false)}
        actions={(
          <>
            <Button
              secondary
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEmpty(attributes?.url)}
              onClick={() => mutation()}
              loading={loading}
              marginLeft="medium"
            >
              Create
            </Button>
          </>
        )}
      >
        <FormField label="URL">
          <Input
            onChange={({ target: { value } }) => setAttributes({ ...attributes, url: value })}
            placeholder="https://hooks.slack.com/services/..."
            value={attributes.url}
          />
        </FormField>
      </Modal>
    </>
  )
}
