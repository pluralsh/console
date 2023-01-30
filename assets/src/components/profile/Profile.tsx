import { Box } from 'grommet'
import { Flex, P } from 'honorable'
import { Button, ContentCard, ValidatedInput } from '@pluralsh/design-system'
import { useContext, useState } from 'react'

import { UPDATE_USER } from 'components/graphql/users'

import { LoginContext } from 'components/contexts'
import { useMutation } from '@apollo/client'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

export function Profile() {
  const { me } = useContext<any>(LoginContext)
  const [name, setName] = useState(me.name)
  const [email, setEmail] = useState(me.email)
  const [mutation, { loading }] = useMutation(UPDATE_USER, { variables: { attributes: { name, email } } })
  const changed = name !== me.name || email !== me.email

  return (
    <ScrollablePage heading="Profile">
      <ContentCard overflowY="auto">
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
          />
        </Box>
        <Flex
          align="center"
          gap="medium"
          justifyContent="flex-end"
          marginTop="small"
        >
          {changed && (
            <P
              body2
              color="text-xlight"
            >
              Unsaved changes
            </P>
          )}
          <Button
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
