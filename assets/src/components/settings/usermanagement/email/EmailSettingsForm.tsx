import { useMutation } from '@apollo/client'
import { Button, Card, ValidatedInput } from '@pluralsh/design-system'
import { UPDATE_SMTP } from 'components/graphql/plural'
import { useState } from 'react'
import { useTheme } from 'styled-components'

export const cleanSmtpForm = (smtp) => {
  const { __typename, ...vals } = smtp || {}

  return vals
}

export default function EmailSettingsForm({ smtp }) {
  const theme = useTheme()
  const [form, setForm] = useState(cleanSmtpForm(smtp))
  const [mutation, { loading }] = useMutation(UPDATE_SMTP, {
    variables: { smtp: form },
  })

  return (
    <Card
      css={{
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
        overflow: 'auto',
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.small,
          overflowY: 'auto',
          height: 'calc(100% - 88px)',
          padding: `${theme.spacing.xlarge}px 128px`,
        }}
      >
        <ValidatedInput
          label="Server"
          placeholder="smtp.sendrid.net"
          width="100%"
          value={form.server || ''}
          onChange={({ target: { value } }) =>
            setForm({ ...form, server: value })
          }
        />
        <ValidatedInput
          label="Port"
          placeholder="587"
          width="100%"
          value={form.port || ''}
          onChange={({ target: { value } }) =>
            setForm({ ...form, port: parseInt(value) })
          }
        />
        <ValidatedInput
          label="Sender"
          hint="From address for outgoing emails"
          width="100%"
          value={form.sender || ''}
          onChange={({ target: { value } }) =>
            setForm({ ...form, sender: value })
          }
        />
        <ValidatedInput
          label="User"
          hint="Username for SMTP authentication"
          width="100%"
          value={form.user || ''}
          onChange={({ target: { value } }) =>
            setForm({ ...form, user: value })
          }
        />
        <ValidatedInput
          label="Password"
          hint="Password for SMTP authentication"
          type="password"
          width="100%"
          value={form.password || ''}
          onChange={({ target: { value } }) =>
            setForm({ ...form, password: value })
          }
        />
      </div>
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-end',
          height: 88,
          justifyContent: 'end',
          padding: `${theme.spacing.xlarge}px 134px`,
        }}
      >
        <Button
          onClick={() => mutation()}
          loading={loading}
        >
          Update
        </Button>
      </div>
    </Card>
  )
}
