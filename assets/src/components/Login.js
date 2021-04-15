import React, { useState } from 'react'
import { GqlError } from 'forge-core' 
import { useQuery, useMutation } from 'react-apollo'
import { Box, Keyboard, Text, FormField, TextInput } from 'grommet'
import { Button } from 'forge-core'
import { setToken, wipeToken } from '../helpers/auth'
import { ME_Q, SIGNIN } from './graphql/users'
import { IncidentContext } from './incidents/context'

const POLL_INTERVAL = 3 * 60 * 1000

export const LoginContext = React.createContext({me: null})

export function EnsureLogin({children}) {
  const {data, error} = useQuery(ME_Q, {pollInterval: POLL_INTERVAL})

  if (error) {
    wipeToken()
    window.location = '/login'
  }
  if (!data) return null

  const {me, externalToken, clusterInfo: {__typename, ...clusterInformation}} = data

  return (
    <IncidentContext.Provider value={{clusterInformation}}>
      <LoginContext.Provider value={{me, token: externalToken}}>
        {children}
      </LoginContext.Provider>
    </IncidentContext.Provider>
  )
}

export default function Login() {
  const [form, setForm] = useState({email: '', password: ''})
  const {data} = useQuery(ME_Q)
  const [mutation, {loading, error}] = useMutation(SIGNIN, {
    variables: form,
    onCompleted: ({signIn: {jwt}}) => {
      setToken(jwt)
      window.location = '/'
    },
    onError: console.log
  })

  if (!error && data && data.me) {
    window.location = '/'
  }
  const disabled = form.password.length === 0 || form.email.length === 0

  return (
    <Box direction="column" align="center" justify="center" height="100vh" background='backgroundColor'>
      <Box width="60%" pad='medium' border={{color: 'light-3'}} background='white' round='xsmall'>
        <Keyboard onEnter={disabled ? null : mutation}>
          <Box margin={{bottom: '10px'}} gap='small'>
            {error && <GqlError header='Login failed' error={error} />}
            <Box justify='center' align='center'>
              <Text weight="bold">Login</Text>
            </Box>
            <FormField label='Email'>
              <TextInput
                value={form.email}
                placehoder='someone@example.com'
                onChange={({target: {value}}) => setForm({...form, email: value})} />
            </FormField>
            <FormField label='Password (at least 10 chars)'>
              <TextInput
                type='password'
                value={form.password}
                placehoder='a long password'
                onChange={({target: {value}}) => setForm({...form, password: value})} />
            </FormField>
            <Box direction='row' align='center' justify='end'>
              <Button 
                label='Login' 
                onClick={mutation} 
                loading={loading} 
                disabled={disabled} />
            </Box>
          </Box>
        </Keyboard>
      </Box>
    </Box>
  )
}