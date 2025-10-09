import {
  Button,
  Flex,
  Switch,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { LoginContext } from 'components/contexts'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Body2P } from 'components/utils/typography/Text'
import { useUpdateUserMutation } from 'generated/graphql'
import { useContext, useState } from 'react'
import { PROFILE_BREADCRUMBS } from './MyProfile'
import { ProfileCard } from './Profile'

export function EmailSettings() {
  useSetBreadcrumbs(PROFILE_BREADCRUMBS)
  const { me } = useContext(LoginContext)
  const [subscribed, setSubscribed] = useState<boolean>(
    me?.emailSettings?.digest ?? true
  )
  const [mutation, { loading }] = useUpdateUserMutation({
    variables: {
      attributes: { emailSettings: { digest: subscribed } },
    },
  })
  const changed = subscribed !== !!me?.emailSettings?.digest

  return (
    <ScrollablePage
      heading="Profile"
      contentStyles={{ overflow: 'auto' }}
    >
      <ProfileCard css={{ minWidth: 300 }}>
        <Flex
          direction="column"
          gap="large"
        >
          <Switch
            checked={subscribed}
            onChange={() => setSubscribed(!subscribed)}
            css={{
              flexDirection: 'row-reverse',
              justifyContent: 'space-between',
            }}
          >
            Subscribe to digest emails
          </Switch>
          <Flex
            align="center"
            justifyContent="flex-end"
            gap="medium"
          >
            {changed && <Body2P $color="text-xlight">Unsaved changes</Body2P>}
            <Button
              disabled={!changed}
              onClick={() => mutation()}
              loading={loading}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </ProfileCard>
    </ScrollablePage>
  )
}
