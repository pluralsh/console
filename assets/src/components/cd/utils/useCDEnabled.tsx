import { useLogin } from 'components/contexts'

export const useCDEnabled = () => {
  const login = useLogin()

  // TODO: Remove this debug value
  return false

  return !!login?.configuration?.features?.cd
}
