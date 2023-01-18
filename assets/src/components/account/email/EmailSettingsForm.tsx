import { useMutation } from '@apollo/client'
import { Button, ValidatedInput } from '@pluralsh/design-system'
import { UPDATE_SMTP } from 'components/graphql/plural'
import { Flex } from 'honorable'
import { useState } from 'react'

const clean = smtp => {
  const { __typename, ...vals } = smtp || {}

  return vals
}

export default function EmailSettingsForm({ smtp }) {
  const [form, setForm] = useState(clean(smtp))
  const [mutation, { loading }] = useMutation(UPDATE_SMTP, {
    variables: { smtp: form },
  })

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <ValidatedInput
        label="Server"
        placeholder="smtp.sendrid.net"
        width="100%"
        value={form.server || ''}
        oonChange={({ target: { value } }) => setForm({ ...form, server: value })}
      />
      <ValidatedInput
        label="Port"
        placeholder="587"
        width="100%"
        value={form.port || ''}
        onChange={({ target: { value } }) => setForm({ ...form, port: parseInt(value) })}
      />
      <ValidatedInput
        label="Sender"
        hint="From address for outgoing emails"
        width="100%"
        value={form.sender || ''}
        onChange={({ target: { value } }) => setForm({ ...form, sender: value })}
      />
      <ValidatedInput
        label="User"
        hint="Username for SMTP authentication"
        width="100%"
        value={form.user || ''}
        onChange={({ target: { value } }) => setForm({ ...form, user: value })}
      />
      <ValidatedInput
        label="Password"
        hint="Password for SMTP authentication"
        type="password"
        width="100%"
        value={form.password || ''}
        onChange={({ target: { value } }) => setForm({ ...form, password: value })}
      />
      <Flex
        justifyContent="flex-end"
        marginTop="small"
      >
        <Button
          onClick={() => mutation()}
          loading={loading}
        >
          Update
        </Button>
      </Flex>
    </Flex>
  )
}
