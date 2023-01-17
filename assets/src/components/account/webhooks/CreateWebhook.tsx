import { Button, Modal } from '@pluralsh/design-system'
import { useState } from 'react'
import { FormField, TextInput } from 'grommet'
import { appendConnection, updateCache } from 'utils/graphql'
import { useMutation } from '@apollo/client'
import { CREATE_WEBHOOK, WEBHOOKS_Q } from 'components/graphql/webhooks'

export function CreateWebhook() {
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
      <Button
        small
        fontWeight={600}
        onClick={() => setOpen(true)}
      >
        Add Slack webhook
      </Button>
      <Modal
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
              onClick={() => mutation()}
              loading={loading}
              marginLeft="medium"
            >
              Create
            </Button>
          </>
        )}
      >
        <FormField label="url">
          <TextInput
            placeholder="https://hooks.slack.com/services/..."
            value={attributes.url}
            onChange={({ target: { value } }) => setAttributes({ ...attributes, url: value })}
          />
        </FormField>
      </Modal>
    </>
  )
}
