import {
  Button,
  Card,
  Flex,
  Switch,
  Toast,
  ValidatedInput,
} from '@pluralsh/design-system'
import { useDeploymentSettings } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import {
  SmtpSettingsAttributes,
  useUpdateDeploymentSettingsMutation,
} from 'generated/graphql'
import { FormEvent, useState } from 'react'
import { useTheme } from 'styled-components'

export function GlobalSettingsSMTP() {
  const theme = useTheme()
  const { smtp } = useDeploymentSettings()
  const [form, setForm] = useState<SmtpSettingsAttributes>({
    ...defaultForm,
    ...cleanSmtpForm(smtp),
    password: '',
  })
  const [showToast, setShowToast] = useState(false)

  const [mutation, { loading, error }] = useUpdateDeploymentSettingsMutation({
    variables: {
      attributes: {
        smtp: form,
      },
    },
    onCompleted: () => {
      setShowToast(true)
      setForm({
        ...form,
        password: '',
      })
    },
  })

  const allowSubmit = !!(
    form.server &&
    form.port &&
    form.sender &&
    form.user &&
    form.password
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation()
  }

  return (
    <ScrollablePage heading="SMTP Settings">
      <form onSubmit={handleSubmit}>
        <Card
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.medium,
            padding: theme.spacing.xlarge,
          }}
        >
          {error && <GqlError error={error} />}
          <ValidatedInput
            label="Server"
            placeholder="smtp.sendrid.net"
            value={form.server || ''}
            onChange={(e) =>
              setForm({
                ...form,
                server: e.target.value,
              })
            }
          />
          <ValidatedInput
            label="Port"
            placeholder="587"
            value={form.port || ''}
            onChange={(e) =>
              setForm({
                ...form,
                port: parseInt(e.target.value),
              })
            }
          />
          <ValidatedInput
            label="Sender"
            hint="From address for outgoing emails"
            value={form.sender || ''}
            onChange={(e) =>
              setForm({
                ...form,
                sender: e.target.value,
              })
            }
          />
          <ValidatedInput
            label="User"
            hint="Username for SMTP authentication"
            value={form.user || ''}
            onChange={(e) =>
              setForm({
                ...form,
                user: e.target.value,
              })
            }
          />
          <ValidatedInput
            label="Password"
            hint="Password for SMTP authentication"
            type="password"
            value={form.password || ''}
            onChange={(e) =>
              setForm({
                ...form,
                password: e.target.value,
              })
            }
          />
          <Flex justify="space-between">
            <Switch
              checked={form.ssl}
              onChange={(checked) =>
                setForm({
                  ...form,
                  ssl: checked,
                })
              }
              css={{
                ...theme.partials.text.body2Bold,
                color: theme.colors.text,
              }}
            >
              SSL
            </Switch>
            <Button
              type="submit"
              disabled={!allowSubmit}
              loading={loading}
            >
              Update
            </Button>
          </Flex>
        </Card>
      </form>
      <Toast
        severity="success"
        css={{
          margin: theme.spacing.large,
        }}
        show={showToast}
        onClose={() => setShowToast(false)}
      >
        SMTP settings updated successfully
      </Toast>
    </ScrollablePage>
  )
}

const defaultForm = {
  server: '',
  port: 587,
  sender: '',
  user: '',
  ssl: false,
}

const cleanSmtpForm = (smtp) => {
  const { __typename, ...vals } = smtp || {}

  return vals
}
