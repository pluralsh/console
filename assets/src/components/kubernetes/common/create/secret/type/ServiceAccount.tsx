import { Dispatch, ReactNode, SetStateAction, useEffect } from 'react'
import { Input } from '@pluralsh/design-system'

interface ServiceAccountProps {
  serviceAccount: string
  setServiceAccount: Dispatch<SetStateAction<string>>
  setValid: Dispatch<SetStateAction<boolean>>
}

function ServiceAccount({
  serviceAccount,
  setServiceAccount,
  setValid,
}: ServiceAccountProps): ReactNode {
  useEffect(() => {
    setValid(!!serviceAccount)
  }, [serviceAccount, setValid])

  return (
    <Input
      placeholder="my-service-account"
      value={serviceAccount}
      onChange={(e) => {
        setServiceAccount(e.target.value)
      }}
    />
  )
}

export { ServiceAccount }
