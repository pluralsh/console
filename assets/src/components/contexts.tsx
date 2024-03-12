import {
  ComponentProps,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react'
import { jwtDecode } from 'jwt-decode'
import {
  fetchRefreshToken,
  fetchToken,
  setRefreshToken,
  setToken,
  wipeRefreshToken,
  wipeToken,
} from 'helpers/auth'

import { Edge } from 'utils/graphql'

import { useNavigate } from 'react-router-dom'

import {
  MeQuery,
  PersonaConfigurationFragment,
  RefreshTokenFragment,
  useLogoutMutation,
  useRefreshLazyQuery,
} from '../generated/graphql'

import { reducePersonaConfigs } from './login/reducePersonaConfigs'

export type Login = {
  me: MeQuery['me']
  configuration: MeQuery['configuration']
  personaConfiguration: Omit<PersonaConfigurationFragment, '__typeName'>
  token: MeQuery['externalToken']
  logout: () => void
  refresh: () => void
}

const JWT_REFRESH_THRESHOLD = 900_000 as const // 15 minutes

const DEFAULT_LOGIN = {
  me: undefined,
  configuration: undefined,
  personaConfiguration: undefined,
  token: undefined,
  logout: () => {
    wipeToken()
    window.location = '/login' as any as Location
  },
  refresh: () => {},
} as const satisfies Partial<Login>
const LoginContext = createContext<Partial<Login>>(DEFAULT_LOGIN)

export const useLogin = () => useContext(LoginContext)

const findLatestRefreshToken = (
  tokenEdges: Nullable<Nullable<Edge<RefreshTokenFragment>>[]>
) =>
  tokenEdges?.reduce(
    (newest, token, i) => {
      console.log(i, token?.node?.token)
      if (!newest && token?.node) return token.node
      if (!token?.node) return undefined
      if (
        token?.node?.updatedAt &&
        newest?.updatedAt &&
        token.node.updatedAt > newest.updatedAt
      ) {
        console.log('updatedAt', token.node.updatedAt, newest.updatedAt)

        return token.node
      }

      return newest
    },
    undefined as RefreshTokenFragment | undefined
  )

function completeLogout() {
  wipeToken()
  wipeRefreshToken()
  // window.location = '/login' as any as Location
}

export function LoginContextProvider({
  value: valueProp,
  ...props
}: {
  value?: MeQuery | undefined
} & Omit<ComponentProps<typeof LoginContext.Provider>, 'value'>) {
  const personaConfig = useMemo(
    () => reducePersonaConfigs(valueProp?.me?.personas),
    [valueProp?.me?.personas]
  )
  const refreshToken = useMemo(
    () => findLatestRefreshToken(valueProp?.refreshTokens?.edges)?.token,
    [valueProp?.refreshTokens?.edges]
  )

  if (refreshToken) {
    setRefreshToken(refreshToken)
  }

  const [logout] = useLogoutMutation({
    onCompleted: completeLogout,
    onError: completeLogout,
  })
  const [refreshQuery, { loading: refreshLoading, ...refreshStatus }] =
    useRefreshLazyQuery({
      variables: { token: refreshToken || '' },
      onCompleted: (res) => {
        console.log('refreshQuery refreshed', res.refresh?.jwt)
        setToken(res.refresh?.jwt)
        if (!res.refresh?.jwt) {
          logout()
        }
      },
      onError: (err) => {
        console.log('refreshQuery error', err)
        logout()
      },
      fetchPolicy: 'network-only',
    })
  const jwt = fetchToken()

  console.log('refreshQuery loading', refreshLoading)
  console.log('refreshQuery status', refreshStatus)
  useEffect(() => {
    if (
      !refreshLoading &&
      (!jwt ||
        (jwtDecode(jwt)?.exp ?? 0) * 1000 < Date.now() + JWT_REFRESH_THRESHOLD)
    ) {
      refreshQuery()
    }
  }, [jwt, refreshLoading, refreshQuery])

  const value = useMemo(
    () =>
      !valueProp
        ? DEFAULT_LOGIN
        : {
            me: valueProp.me,
            configuration: valueProp.configuration,
            token: valueProp.externalToken,
            personaConfiguration: personaConfig,
            logout: () => {
              logout()
            },
            refresh: () => {
              console.log('refreshQuery refreshing')
              refreshQuery({ variables: { token: fetchRefreshToken() || '' } })
            },
          },
    [logout, personaConfig, refreshQuery, valueProp]
  )

  return (
    <LoginContext.Provider
      value={value}
      {...props}
    />
  )
}

export { LoginContext }
