import { Box } from 'grommet'
import { Flex } from 'honorable'
import { Button, ContentCard, ValidatedInput } from '@pluralsh/design-system'
import { useContext, useState } from 'react'
import { useTheme } from 'styled-components'

import { UPDATE_USER } from 'components/graphql/users'

import { LoginContext } from 'components/contexts'
import { useMutation } from '@apollo/client'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { ValidationResponse } from '@pluralsh/design-system/dist/components/ValidatedInput'
import { isValidEmail } from 'utils/email'
import { isEmpty } from 'lodash'

export function Profile() {
  const { me } = useContext<any>(LoginContext)
  const [name, setName] = useState<string>(me.name)
  const [email, setEmail] = useState<string>(me.email)
  const [mutation, { loading }] = useMutation(UPDATE_USER, {
    variables: { attributes: { name, email } },
  })
  const changed = name !== me.name || email !== me.email
  const valid = !isEmpty(name) && isValidEmail(email)
  const theme = useTheme()

  return (
    <ScrollablePage heading="Profile">
      <ContentCard
        maxHeight="100%"
        overflowY="auto"
      >
        <Box gap="small">
          <ValidatedInput
            label="Full name"
            width="100%"
            value={name}
            onChange={({ target: { value } }) => setName(value)}
          />
          <ValidatedInput
            label="Email address"
            width="100%"
            value={email}
            onChange={({ target: { value } }) => setEmail(value)}
            validation={(email: string): ValidationResponse =>
              isValidEmail(email)
                ? { error: false, message: '' }
                : { error: true, message: 'Invalid email address' }
            }
          />
        </Box>
        <Flex
          align="center"
          gap="medium"
          justifyContent="flex-end"
          marginTop="small"
        >
          {changed && (
            <p
              css={{
                ...theme.partials.text.body2,
                color: theme.colors['text-xlight'],
              }}
            >
              Unsaved changes
            </p>
          )}
          <Button
            disabled={!valid}
            onClick={() => mutation()}
            loading={loading}
          >
            Save
          </Button>
        </Flex>
      </ContentCard>
    </ScrollablePage>
  )
}
