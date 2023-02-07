import { ComponentProps } from 'react'
import { Code } from '@pluralsh/design-system'

export function RawPageCode({ children, ...props }: ComponentProps<typeof Code>) {
  return (
    <Code
      maxHeight="100%"
      overflowY="auto"
      language="yaml"
      {...props}
    >
      {children}
    </Code>
  )
}
