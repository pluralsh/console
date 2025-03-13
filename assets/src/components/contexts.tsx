import {
  fetchRefreshToken,
  fetchToken,
  setToken,
  wipeRefreshToken,
  wipeToken,
} from 'helpers/auth'
import { jwtDecode } from 'jwt-decode'
import {
  ComponentProps,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
} from 'react'

import {
  MeQuery,
  PersonaConfigurationFragment,
  useLogoutMutation,
  useRefreshLazyQuery,
} from '../generated/graphql'

import { reducePersonaConfigs } from './login/reducePersonaConfigs'

export type Login = {
  me: MeQuery['me']
  configuration: MeQuery['configuration']
  personaConfiguration: Omit<PersonaConfigurationFragment, '__typeName'>
  logout: () => void
}

const JWT_REFRESH_THRESHOLD = 300_000 as const // 5 minutes

const DEFAULT_LOGIN = {
  me: undefined,
  configuration: undefined,
  personaConfiguration: undefined,
  logout: completeLogout,
} as const satisfies Partial<Login>
const LoginContext = createContext<Partial<Login>>(DEFAULT_LOGIN)

export const useLogin = () => use(LoginContext)
export const useIsManager = () => {
  const { me } = useLogin()

  return (
    me?.personas?.find(
      (persona) => persona?.configuration?.home?.manager === true
    ) !== undefined
  )
}

function completeLogout() {
  wipeToken()
  wipeRefreshToken()
  ;(window as Window).location = '/login'
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

  const [logout] = useLogoutMutation({
    onCompleted: completeLogout,
    onError: completeLogout,
  })
  const [refreshQuery, { loading: refreshLoading }] = useRefreshLazyQuery({
    onCompleted: (res) => {
      setToken(res.refresh?.jwt)
      if (!res.refresh?.jwt) {
        logout()
      }
    },
    onError: () => {
      logout()
    },
    fetchPolicy: 'network-only',
  })
  const jwt = fetchToken()

  const refresh = useCallback(() => {
    refreshQuery({ variables: { token: fetchRefreshToken() || '' } })
  }, [refreshQuery])

  useEffect(() => {
    if (
      !refreshLoading &&
      (!jwt ||
        (jwtDecode(jwt)?.exp ?? 0) * 1000 < Date.now() + JWT_REFRESH_THRESHOLD)
    ) {
      refresh()
    }
  }, [jwt, refresh, refreshLoading, refreshQuery])

  const value = useMemo(
    () =>
      !valueProp
        ? DEFAULT_LOGIN
        : {
            me: valueProp.me,
            configuration: valueProp.configuration,
            personaConfiguration: personaConfig,
            logout,
          },
    [logout, personaConfig, valueProp]
  )

  return (
    <LoginContext
      value={value}
      {...props}
    />
  )
}

export { LoginContext }
