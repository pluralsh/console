import { useLogin } from 'components/contexts'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import { StretchedFlex } from 'components/utils/StretchedFlex'
import { Body1P } from 'components/utils/typography/Text'
import styled from 'styled-components'
import UserInvite from './UserInvite'
import { UsersList } from './UsersList'

const breadcrumbs = getUserManagementBreadcrumbs('users')

export default function Users() {
  const { configuration } = useLogin()

  useSetBreadcrumbs(breadcrumbs)

  return (
    <WrapperSC>
      <StretchedFlex>
        <Body1P $color="text-light">
          See users in your org. Change them to admin here.
        </Body1P>
        {!configuration?.pluralLogin && !configuration?.externalOidc && (
          <UserInvite />
        )}
      </StretchedFlex>
      <UsersList />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  minHeight: 0,
  height: '100%',
}))
