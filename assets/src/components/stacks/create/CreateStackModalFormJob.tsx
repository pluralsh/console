import { Callout, CodeEditor, FormField, Input } from '@pluralsh/design-system'
import { useEffect, useRef } from 'react'

export function CreateStackModalFormJob({
  jobNamespace,
  setJobNamespace,
  jobSpec,
  setJobSpec,
  loading,
}: {
  jobNamespace: string
  setJobNamespace: (name: string) => void
  jobSpec: string
  setJobSpec: (image: string) => void
  loading: boolean
}): any {
  const inputRef = useRef<HTMLInputElement>(undefined)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <>
      <Callout>
        Specifying job details is optional. You can skip this step if you want
        to use defaults.
      </Callout>
      <FormField
        label="Namespace"
        error={!!jobSpec && !jobNamespace}
        hint={
          jobSpec && !jobNamespace
            ? 'Namespace cannot be empty if spec was provided'
            : undefined
        }
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={jobNamespace}
          onChange={(e) => setJobNamespace(e.currentTarget.value)}
          disabled={loading}
        />
      </FormField>
      <FormField
        label="Spec"
        error={!!jobNamespace && !jobSpec}
        hint={
          jobNamespace && !jobSpec
            ? 'Spec cannot be empty if namespace was provided'
            : undefined
        }
      >
        <CodeEditor
          disabled={loading}
          value={jobSpec}
          onChange={(values) => setJobSpec(values)}
          language="yaml"
          height={200}
        />
      </FormField>
    </>
  )
}
