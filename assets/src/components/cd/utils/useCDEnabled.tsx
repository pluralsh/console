import { useLogin } from 'components/contexts'

export const useCDEnabled = () => {
  const login = useLogin()

  // TODO: Figure out proper feature flag
  return !!login?.configuration?.features?.userManagement
}
