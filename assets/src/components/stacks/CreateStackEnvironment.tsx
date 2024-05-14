import { FormField, Input, Switch } from '@pluralsh/design-system'
import { useEffect, useRef, useState } from 'react'

import { StackEnvironmentAttributes } from '../../generated/graphql'

export function CreateStackEnvironment({
  environment,
  setEnvironment,
}: {
  environment: StackEnvironmentAttributes[]
  setEnvironment: (environment: StackEnvironmentAttributes[]) => void
}): any {
  const inputRef = useRef<HTMLInputElement>()
  const [name, setName] = useState<string>('')
  const [value, setValue] = useState<string>('')
  const [secret, setSecret] = useState<boolean>(false)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <>
      <FormField
        required
        label="Name"
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </FormField>

      <FormField
        required
        label="Value"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
      </FormField>

      <Switch
        checked={secret}
        onChange={setSecret}
      >
        Secret
      </Switch>
    </>
  )
}
