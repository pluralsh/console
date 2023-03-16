import { useMutation } from '@apollo/client'
import { Button, Card, ValidatedInput } from '@pluralsh/design-system'
import { UPDATE_SMTP } from 'components/graphql/plural'
import { Div, Flex } from 'honorable'
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
    <Card
      direction="column"
      maxHeight="100%"
      overflow="auto"
    >
      <Div
        direction="column"
        gap="small"
        overflowY="auto"
        height="calc(100% - 88px)"
        paddingHorizontal={128}
        paddingVertical="xlarge"
      >
        <ValidatedInput
          label="Server"
          placeholder="smtp.sendrid.net"
          width="100%"
          value={form.server || ''}
          onChange={({ target: { value } }) => setForm({ ...form, server: value })}
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
      </Div>
      <Flex
        align="end"
        height={88}
        justifyContent="end"
        paddingHorizontal={134}
        paddingBottom="xlarge"
      >
        <Button
          onClick={() => mutation()}
          loading={loading}
        >
          Update
        </Button>
      </Flex>
    </Card>
  )
}
