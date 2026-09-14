import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useLogin } from 'components/contexts'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body1P } from 'components/utils/typography/Text'
import { getUserManagementBreadcrumbs } from '../UserManagement'
import UserInvite from './UserInvite'
import { UsersList } from './UsersList'

const breadcrumbs = getUserManagementBreadcrumbs('users')

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <Flex
      direction="column"
      gap="medium"
      height="100%"
      minHeight={0}
    >
      <StretchedFlex>
        <Body1P $color="text-light">
          See users in your org. Change them to admin here.
        </Body1P>
        {!configuration?.pluralLogin && !configuration?.externalOidc && (
          <UserInvite />
        )}
      </StretchedFlex>
      <UsersList />
    </Flex>
  )
}
