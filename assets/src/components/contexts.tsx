import { ComponentProps, createContext, useContext } from 'react'

import { MeQuery } from '../generated/graphql'

export type Login = {
  me: MeQuery['me']
  configuration: MeQuery['configuration']
  token: MeQuery['externalToken']
}

const DEFAULT_LOGIN = {
  me: undefined,
  configuration: undefined,
  token: undefined,
}
const LoginContext = createContext<Login>(DEFAULT_LOGIN)

export const useLogin = () => useContext(LoginContext)

export function LoginContextProvider({
  value,
  ...props
}: {
  value?: Login | null
} & Omit<ComponentProps<typeof LoginContext.Provider>, 'value'>) {
  return (
    <LoginContext.Provider
      value={value || DEFAULT_LOGIN}
      {...props}
    />
  )
}

export { LoginContext }
