import { useLogin } from 'components/contexts'

export const useCDEnabled = () => {
  const login = useLogin()

  return !!login?.configuration?.features?.userManagement
}
