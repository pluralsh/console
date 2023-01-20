import { BreadcrumbsContext } from 'components/Breadcrumbs'
import {
  Button,
  Card,
  LoopingLogo,
  PageTitle,
} from '@pluralsh/design-system'
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
import isEqual from 'lodash/isEqual'
import sortBy from 'lodash/sortBy'

import { PluralApi } from 'components/PluralApi'
import { useNavBlocker } from 'components/hooks/useNavBlocker'

import { BindingInput, groupSuggestion, userSuggestion } from '../../../utils/BindingInput'

import {
  INSTALLATION,
  SEARCH_GROUPS,
  SEARCH_USERS,
  UPDATE_PROVIDER,
} from './queries'

const sanitize = ({ id, user, group }) => ({ id, userId: user && user.id, groupId: group && group.id })

export function fetchUsers(client, query, setSuggestions) {
  client.query({ query: SEARCH_USERS, variables: { q: query, all: true } })
    .then(({ data: { users: { edges } } }) => edges.map(({ node }) => ({ value: node, label: userSuggestion(node) })))
    .then(setSuggestions)
}

export function fetchGroups(client, query, setSuggestions) {
  client.query({ query: SEARCH_GROUPS, variables: { q: query } })
    .then(({ data: { groups: { edges } } }) => edges.map(({ node }) => ({ value: node, label: groupSuggestion(node) })))
    .then(setSuggestions)
}

function bindingsAreEquivalent(bindings1: any[], bindings2: any[]) {
  if (bindings1.length !== bindings2.length) {
    return false
  }
  const groups1 = sortBy(bindings1.map(b => b.group).filter(b => !!b),
    ['id'])
  const groups2 = sortBy(bindings2.map(b => b.group).filter(b => !!b),
    ['id'])
  const users1 = sortBy(bindings1.map(b => b.user).filter(b => !!b),
    ['id'])
  const users2 = sortBy(bindings2.map(b => b.user).filter(b => !!b),
    ['id'])

  const sorted1 = [...groups1, ...users1]
  const sorted2 = [...groups2, ...users2]

  sorted1.forEach((b1, i) => {
    if (!isEqual(b1, sorted2[i])) {
      return false
    }
  })

  return true
}

function UserManagementCard({ id, provider }) {
  const { authMethod, redirectUris, bindings: initialBindings } = provider
  const [bindings, setBindings] = useState(initialBindings)
  const [mutation, { loading, error }] = useMutation(UPDATE_PROVIDER, {
    variables: { id, attributes: { authMethod, redirectUris, bindings: bindings.map(sanitize) } },
  })
  const changed = useMemo(() => !bindingsAreEquivalent(initialBindings, bindings),
    [bindings, initialBindings])
  const navBlocker = useNavBlocker(changed)

  return (
    <Card
      paddingHorizontal={100}
      paddingVertical="large"
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
  const { data, error } = useQuery(INSTALLATION,
    { variables: { name: appName }, fetchPolicy: 'cache-and-network' })

  if (error) {
    return (
      <GqlError
        error={error}
        header="Could not update provider"
      />
    )
  }

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

  const { installation } = data

  return installation && installation.oidcProvider
    ? (
      <UserManagementCard
        id={installation.id}
        provider={installation.oidcProvider}
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
