import {
  Button,
  Callout,
  Card,
  ReturnIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { useConsumeSecretMutation } from '../../generated/graphql'
import { InputRevealer } from '../cd/providers/InputRevealer'
import { Overline } from '../cd/utils/PermissionsModal'
import { Body2BoldP } from '../utils/typography/Text'

export default function ConsumeSecret() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { handle = '' } = useParams()

  useSetBreadcrumbs(useMemo(() => [{ label: 'secrets' }], []))

  const [mutation, { loading, data, error }] = useConsumeSecretMutation({
    variables: { handle },
  })

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'center',
        padding: theme.spacing.xlarge,
        width: '100%',
      }}
    >
      <Card
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.xlarge,
          maxWidth: 572,
          padding: theme.spacing.xlarge,
        }}
      >
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xsmall,
          }}
        >
          <Overline>Share secret</Overline>
          <p>
            A user of this Console has shared a secret with you. After you
            display this secret a single time it will expire.
          </p>
        </div>
        {error ? (
          <Callout
            title="You do not have access to this secret"
            severity="danger"
            css={{
              maxWidth: 572,
            }}
          >
            <div
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.medium,
              }}
            >
              <p>
                Either this URL has already been consumed, or you do not have
                permission to view this URL. If you think this is a mistake,
                please contact the system administrator.
              </p>
              <Button
                secondary
                small
                startIcon={<ReturnIcon />}
                onClick={() => navigate('/')}
                width="fit-content"
              >
                Back home
              </Button>
            </div>
          </Callout>
        ) : data ? (
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
            }}
          >
            <Body2BoldP>{data.consumeSecret?.name}</Body2BoldP>
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
              }}
            >
              <InputRevealer
                value={data.consumeSecret?.secret}
                css={{ width: '100%' }}
              />
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(
                    data.consumeSecret?.secret ?? ''
                  )
                }
              >
                Copy secret
              </Button>
            </div>
          </div>
        ) : (
          <Button
            loading={loading}
            onClick={() => mutation()}
          >
            Consume secret
          </Button>
        )}
      </Card>
    </div>
  )
}
