import {
  Button,
  ContentCard,
  Flex,
  ValidatedInput,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useState } from 'react'

import { ValidationResponse } from '@pluralsh/design-system/dist/components/ValidatedInput'
import { useLogin } from 'components/contexts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { isEmpty } from 'lodash'
import { isValidEmail } from 'utils/email'

import { Body2P } from 'components/utils/typography/Text'
import { useUpdateUserMutation } from 'generated/graphql'
import { PROFILE_BREADCRUMBS } from './MyProfile'

export function Profile() {
  useSetBreadcrumbs(PROFILE_BREADCRUMBS)
  const { me } = useLogin()
  const [name, setName] = useState<string>(me?.name ?? '')
  const [email, setEmail] = useState<string>(me?.email ?? '')
  const [mutation, { loading }] = useUpdateUserMutation({
    variables: {
      attributes: { name, email },
    },
  })
  const changed = name !== me?.name || email !== me?.email
  const valid = !isEmpty(name) && isValidEmail(email)

  return (
    <ScrollablePage heading="Profile">
      <ContentCard
        maxHeight="100%"
        overflowY="auto"
      >
        <Flex
          direction="column"
          gap="large"
        >
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
          <Flex
            align="center"
            justifyContent="flex-end"
            gap="medium"
          >
            {changed && <Body2P $color="text-xlight">Unsaved changes</Body2P>}
            <Button
              disabled={!valid || !changed}
              onClick={() => mutation()}
              loading={loading}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </ContentCard>
    </ScrollablePage>
  )
}
