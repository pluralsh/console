import { Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react'
import { Input } from '@pluralsh/design-system'

interface BasicAuthProps {
  data: { key: string; value: string }[]
  setData: Dispatch<SetStateAction<{ key: string; value: string }[]>>
  setValid: Dispatch<SetStateAction<boolean>>
}

function BasicAuth({ setData, setValid }: BasicAuthProps): ReactNode {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    setData([
      { key: 'username', value: username },
      { key: 'password', value: password },
    ])

    setValid(!!username && !!password)
  }, [username, password, setData, setValid])

  return (
    <>
      <Input
        placeholder="username"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value)
        }}
      />
      <Input
        placeholder="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
        }}
      />
    </>
  )
}

export { BasicAuth }
