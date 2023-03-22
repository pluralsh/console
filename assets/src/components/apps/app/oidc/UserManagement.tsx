import { BreadcrumbsContext } from 'components/layout/Breadcrumbs'
import { Button, Card } from '@pluralsh/design-system'
import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Flex, P } from 'honorable'
import { GqlError } from 'forge-core'
import sortBy from 'lodash/sortBy'
import uniqBy from 'lodash/uniqBy'

import { PluralApi } from 'components/PluralApi'
import { useNavBlocker } from 'components/hooks/useNavBlocker'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import { BindingInput, groupSuggestion, userSuggestion } from '../../../utils/BindingInput'

import {
  INSTALLATION,
  SEARCH_GROUPS,
  SEARCH_USERS,
  UPDATE_PROVIDER,
} from './queries'

const sanitize = ({ id, user, group }) => ({
  id,
  userId: user && user.id,
  groupId: group && group.id,
})

export function fetchUsers(client, query, setSuggestions) {
  client
    .query({ query: SEARCH_USERS, variables: { q: query, all: true } })
    .then(({
      data: {
        users: { edges },
      },
    }) => edges.map(({ node }) => ({ value: node, label: userSuggestion(node) })))
    .then(setSuggestions)
}

export function fetchGroups(client, query, setSuggestions) {
  client
    .query({ query: SEARCH_GROUPS, variables: { q: query } })
    .then(({
      data: {
        groups: { edges },
      },
    }) => edges.map(({ node }) => ({ value: node, label: groupSuggestion(node) })))
    .then(setSuggestions)
}

function getBindingsOfType(bindings: any[], type: string) {
  return uniqBy(sortBy(bindings.map(b => b[type]).filter(b => !!b),
    ['name']),
  'id')
}

function isEquivalentBinding(b1, b2) {
  return b1.id === b2.id
}

function areEquivalentBindings(bindings1, bindings2) {
  if (bindings1.length !== bindings2.length) {
    return false
  }
  bindings1.forEach((b1, i) => {
    if (!isEquivalentBinding(b1, bindings2[i])) {
      return false
    }
  })

  return true
}

function UserManagementCard({ id, provider }) {
  const { authMethod, redirectUris, bindings: initialBindings } = provider
  const [bindings, setBindings] = useState(initialBindings)
  const [mutation, { loading, error }] = useMutation(UPDATE_PROVIDER, {
    variables: {
      id,
      attributes: {
        authMethod,
        redirectUris,
        bindings: bindings.map(sanitize),
      },
    },
  })

  const { initialGroupBindings, initialUserBindings } = useMemo(() => ({
    initialGroupBindings: getBindingsOfType(initialBindings, 'group'),
    initialUserBindings: getBindingsOfType(initialBindings, 'user'),
  }),
  [initialBindings])

  const { groupBindings, userBindings } = useMemo(() => ({
    groupBindings: getBindingsOfType(bindings, 'group'),
    userBindings: getBindingsOfType(bindings, 'user'),
  }),
  [bindings])

  const changed = useMemo(() => !areEquivalentBindings(initialGroupBindings, groupBindings)
      || !areEquivalentBindings(initialUserBindings, userBindings),
  [groupBindings, initialGroupBindings, initialUserBindings, userBindings])

  const navBlocker = useNavBlocker(changed)

  return (
    <Card
      paddingHorizontal={100}
      paddingVertical="large"
      maxHeight="100%"
      overflowY="auto"
    >
      {navBlocker}
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
          Control which users and groups have access to this application with
          OIDC.
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
          bindings={groupBindings.map(({ name }) => name)}
          fetcher={fetchGroups}
          add={group => (groupBindings.find(({ id }) => id === group?.id)
            ? null
            : setBindings([...bindings, { group }]))}
          remove={name => setBindings(bindings.filter(({ group }) => !group || group.name !== name))}
        />
        <BindingInput
          type="user"
          bindings={userBindings.map(({ email }) => email)}
          fetcher={fetchUsers}
          add={user => (userBindings.find(({ id }) => id === user?.id)
            ? null
            : setBindings([...bindings, { user }]))}
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
            onClick={() => mutation()}
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
  const { data, error } = useQuery(INSTALLATION, {
    variables: { name: appName },
    fetchPolicy: 'cache-and-network',
  })

  if (error) {
    return (
      <GqlError
        error={error}
        header="Could not update provider"
      />
    )
  }

  if (!data) return <LoadingIndicator />

  const { installation } = data

  return installation && installation.oidcProvider ? (
    <UserManagementCard
      id={installation.id}
      provider={installation.oidcProvider}
    />
  ) : (
    <Flex
      maxHeight="100%"
      overflowY="auto"
    >
      No OIDC provider configured.
    </Flex>
  )
}

export default function UserManagement() {
  const { appName } = useParams()
  const { setBreadcrumbs } = useContext<any>(BreadcrumbsContext)

  useEffect(() => setBreadcrumbs([
    { text: 'apps', url: '/' },
    { text: appName, url: `/apps/${appName}` },
    { text: 'user management', url: `/apps/${appName}/oidc` },
  ]),
  [appName, setBreadcrumbs])

  return (
    <ScrollablePage
      scrollable={false}
      heading="User management"
    >
      <PluralApi><UserManagementContent /></PluralApi>
    </ScrollablePage>
  )
}
