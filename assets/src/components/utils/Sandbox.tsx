import { ApolloSandbox } from '@apollo/sandbox/react'
import { fetchToken } from 'helpers/auth'
import styled from 'styled-components'

export default function Sandbox() {
  const endpoint = window.location.origin + '/gql'
  const token = fetchToken()

  return (
    <SandboxWrapperSC>
      <ApolloSandbox
        runTelemetry={false}
        endpointIsEditable={false}
        initialEndpoint={endpoint}
        initialState={{ sharedHeaders: { Authorization: `Bearer ${token}` } }}
      />
    </SandboxWrapperSC>
  )
}

const SandboxWrapperSC = styled.div({
  display: 'contents',
  '& > div': {
    height: '100vh',
    width: '100vw',
  },
})
