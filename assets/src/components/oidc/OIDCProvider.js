import React, { useState } from 'react'
import { withPluralApi } from '../PluralApi'
import { Divider, GqlError, Button } from 'forge-core'
import { useQuery, useMutation } from '@apollo/react-hooks'
import { INSTALLATION, UPDATE_PROVIDER } from './queries'
import { Box } from 'grommet'
import { BindingInput, sanitize } from '../users/Role'
import { fetchGroups, fetchUsers } from './typeaheads'


function OIDCUpdate({id, provider}) {
  const [bindings, setBindings] = useState(provider.bindings)
  const [mutation, {loading, error}] = useMutation(UPDATE_PROVIDER, {
    variables: {id, attributes: {bindings: bindings.map(sanitize)}}
  })

  return (
    <Box flex={false} gap='xsmall'>
       {error && <GqlError error={error} header='Could not update provider' />}
      <BindingInput
        type='user'
        label='user bindings'
        placeholder='search for users to add'
        bindings={bindings.filter(({user}) => !!user).map(({user: {email}}) => email)}
        fetcher={fetchUsers}
        add={(user) => setBindings([...bindings, {user}])}
        remove={(email) => setBindings(bindings.filter(({user}) => !user || user.email !== email))} />
      <BindingInput
        type='group'
        label='group bindings'
        placeholder='search for groups to add'
        bindings={bindings.filter(({group}) => !!group).map(({group: {name}}) => name)}
        fetcher={fetchGroups}
        add={(group) => setBindings([...bindings, {group}])}
        remove={(name) => setBindings(bindings.filter(({group}) => !group || group.name !== name))} />
      <Box direction='row' justify='end' align='center'>
        <Button label='Update OIDC Provider' loading={loading} onClick={mutation} />
      </Box>
    </Box>
  )
}

function OIDCProviderInner({name}) {
  const {data} = useQuery(INSTALLATION, {variables: {name}, fetchPolicy: 'cache-and-network'})

  if (!data) return null

  const {installation: {id, oidcProvider}} = data

  if (!oidcProvider) return null

  return (
    <>
    <Divider text='OIDC Provider' />
    <OIDCUpdate id={id} provider={oidcProvider} />
    </>
  )
}

export const OIDCProvider = withPluralApi(OIDCProviderInner)