import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Button,
  Card,
  LoopingLogo,
  PageTitle,
} from '@pluralsh/design-system'
import { useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Flex, P } from 'honorable'
import { PluralApi } from 'components/PluralApi'

import { GqlError } from 'forge-core'

import { isEqual } from 'lodash'

import { BindingInput, fetchGroups, fetchUsers } from '../../../utils/BindingInput'

import { INSTALLATION, UPDATE_PROVIDER } from './queries'

const sanitize = ({ id, user, group }) => ({ id, userId: user && user.id, groupId: group && group.id })

function UserManagementCard({ id, provider }) {
  const { authMethod, redirectUris, bindings: initialBindings } = provider
  const [bindings, setBindings] = useState(initialBindings)
  const [mutation, { loading, error }] = useMutation(UPDATE_PROVIDER, {
    variables: { id, attributes: { authMethod, redirectUris, bindings: bindings.map(sanitize) } },
  })
  const changed = !isEqual(initialBindings, bindings)

  return (
    <Card
      paddingHorizontal={100}
      paddingVertical="large"
    >
      <Flex
        direction="column"
        gap="xxsmall"
        paddingVertical="xsmall"
      >
        <P
          body1
          fontWeight={600}
        >
          OpenID Connect
        </P>
        <P
          body2
          color="text-light"
        >
          Control which users and groups have access to this application with OIDC.
        </P>
      </Flex>
      <Flex
        direction="column"
        gap="small"
        paddingVertical="medium"
      >
        {error && (
          <GqlError
            error={error}
            header="Could not update provider"
          />
        )}
        <BindingInput
          type="group"
          bindings={bindings.filter(({ group }) => !!group).map(({ group: { name } }) => name)}
          fetcher={fetchGroups}
          add={group => setBindings([...bindings, { group }])}
          remove={name => setBindings(bindings.filter(({ group }) => !group || group.name !== name))}
        />
        <BindingInput
          type="user"
          bindings={bindings.filter(({ user }) => !!user).map(({ user: { email } }) => email)}
          fetcher={fetchUsers}
          add={user => setBindings([...bindings, { user }])}
          remove={email => setBindings(bindings.filter(({ user }) => !user || user.email !== email))}
        />
        <Flex
          gap="medium"
          justify="end"
          align="center"
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
            disabled={!changed}
            loading={loading}
            onClick={() => mutation}
          >
            Update
          </Button>
        </Flex>
      </Flex>
    </Card>
  )
}

function UserManagementContent() {
  const { appName } = useParams()
  const { data } = useQuery(INSTALLATION,
    { variables: { name: appName }, fetchPolicy: 'cache-and-network' })

  if (!data) {
    return (
      <Flex
        grow={1}
        justify="center"
      >
        <LoopingLogo scale={1} />
      </Flex>
    )
  }

  const { installation: { id, oidcProvider } } = data

  return oidcProvider
    ? (
      <UserManagementCard
        id={id}
        provider={oidcProvider}
      />
    )
    : (<Flex>No OIDC provider configured.</Flex>)
}

export default function UserManagement() {
  const { appName } = useParams()
  const { setBreadcrumbs }: any = useContext(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'user management', url: `/apps/${appName}/oidc` },
  ]), [appName, setBreadcrumbs])

  return (
    <>
      <PageTitle heading="User management" />
      <PluralApi>
        <UserManagementContent />
      </PluralApi>
    </>
  )
}
