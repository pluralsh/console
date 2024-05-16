import { FormField, Input } from '@pluralsh/design-system'
import { useEffect, useRef } from 'react'

export function CreateStackModalFormJob({
  jobNamespace,
  setJobNamespace,
  jobSpec,
  setJobSpec,
}: {
  jobNamespace: string
  setJobNamespace: (name: string) => void
  jobSpec: string
  setJobSpec: (image: string) => void
}): any {
  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <>
      <FormField
        required
        label="Namespace"
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={jobNamespace}
          onChange={(e) => setJobNamespace(e.currentTarget.value)}
        />
      </FormField>
      <FormField
        required
        label="Spec"
      >
        <Input
          value={jobSpec}
          onChange={(e) => setJobSpec(e.currentTarget.value)}
        />
      </FormField>
    </>
  )
}
