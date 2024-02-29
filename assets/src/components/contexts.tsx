import { ComponentProps, createContext, useContext, useMemo } from 'react'

import { MeQuery, PersonaConfigurationFragment } from '../generated/graphql'

import { reducePersonaConfigs } from './login/reducePersonaConfigs'

export type Login = {
  me: MeQuery['me']
  configuration: MeQuery['configuration']
  personaConfiguration: Omit<PersonaConfigurationFragment, '__typeName'>
  token: MeQuery['externalToken']
}

const DEFAULT_LOGIN = {
  me: undefined,
  configuration: undefined,
  personaConfiguration: undefined,
  token: undefined,
} as const satisfies Partial<Login>
const LoginContext = createContext<Partial<Login>>(DEFAULT_LOGIN)

export const useLogin = () => useContext(LoginContext)

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
  const value = useMemo(
    () =>
      !valueProp
        ? DEFAULT_LOGIN
        : {
            me: valueProp.me,
            configuration: valueProp.configuration,
            token: valueProp.externalToken,
            personaConfiguration: personaConfig,
          },
    [personaConfig, valueProp]
  )

  return (
    <LoginContext.Provider
      value={value}
      {...props}
    />
  )
}

export { LoginContext }
