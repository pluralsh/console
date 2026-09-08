import { useLogin } from 'components/contexts'

export const useBackupsEnabled = () => {
  const login = useLogin()

  return !!login?.configuration?.features?.cd // TODO: Switch to backups once it will be added to API.
}
