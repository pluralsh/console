import { fetchToken, setToken, wipeRefreshToken, wipeToken } from 'helpers/auth'
import {
  clearServiceAccountImpersonation,
  isImpersonatingServiceAccount,
} from 'helpers/impersonation'
import { jwtDecode } from 'jwt-decode'
import {
  ComponentProps,
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'

import {
  MeQuery,
  PersonaConfigurationFragment,
  PersonaRole,
  useLogoutMutation,
} from '../generated/graphql'
import { getRefreshedToken } from '../helpers/refreshToken'

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

export const useIsDeveloperPersona = () => {
  const { me } = useLogin()

  return (
    me?.personas?.some((persona) => persona?.role === PersonaRole.Developer) ??
    false
  )
}

export function useCloudSetupUnfinished() {
  const { configuration } = useLogin()
  return !!configuration?.cloud && !configuration?.installed
}

function completeLogout() {
  clearServiceAccountImpersonation()
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
  const refreshLoading = useRef(false)
  const jwt = fetchToken()
  const impersonating = isImpersonatingServiceAccount()

  const refresh = useCallback(async () => {
    refreshLoading.current = true

    try {
      const jwt = await getRefreshedToken()

      if (jwt) {
        setToken(jwt)
      } else {
        logout()
      }
    } catch {
      logout()
    } finally {
      refreshLoading.current = false
    }
  }, [logout])

  useEffect(() => {
    if (impersonating) return

    if (
      !refreshLoading.current &&
      (!jwt ||
        (getJwtExpiry(jwt) ?? 0) * 1000 < Date.now() + JWT_REFRESH_THRESHOLD)
    ) {
      refresh()
    }
  }, [impersonating, jwt, refresh])

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

function getJwtExpiry(jwt: string) {
  try {
    return jwtDecode(jwt)?.exp
  } catch {
    return undefined
  }
}
