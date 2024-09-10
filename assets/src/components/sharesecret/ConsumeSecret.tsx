import { useParams } from 'react-router-dom'
import {
  Button,
  Callout,
  Card,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { useEffect } from 'react'

import { useConsumeSecretMutation } from '../../generated/graphql'
import { InputRevealer } from '../cd/providers/InputRevealer'
import { Overline } from '../cd/utils/PermissionsModal'
import LoadingIndicator from '../utils/LoadingIndicator'
import { Body2BoldP } from '../utils/typography/Text'

export default function ConsumeSecret() {
  const theme = useTheme()
  const { handle = '' } = useParams()

  useSetBreadcrumbs([{ label: 'secrets' }])

  const [mutation, { loading, data, error }] = useConsumeSecretMutation({
    variables: { handle },
  })

  useEffect(() => {
    mutation()
    // Only run on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <LoadingIndicator />

  return (
    <div
      css={{
        display: 'flex',
        justifyContent: 'center',
        padding: theme.spacing.xlarge,
        width: '100%',
      }}
    >
      {error ? (
        <Callout
          title="You do not have access to this secret"
          severity="danger"
          css={{ maxWidth: 572 }}
        >
          Either this URL has already been consumed, or you do not have
          permission to view this URL. If you think this is a mistake, please
          contact the system administrator.
        </Callout>
      ) : (
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
              display this secret a single time it expires.
            </p>
          </div>
          <div
            css={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.xsmall,
            }}
          >
            <Body2BoldP>{data?.consumeSecret?.name}</Body2BoldP>
            <div
              css={{
                display: 'flex',
                gap: theme.spacing.medium,
              }}
            >
              <InputRevealer
                value={data?.consumeSecret?.secret}
                css={{ width: '100%' }}
              />
              <Button
                onClick={() =>
                  navigator.clipboard.writeText(
                    data?.consumeSecret?.secret ?? ''
                  )
                }
              >
                Copy secret
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
