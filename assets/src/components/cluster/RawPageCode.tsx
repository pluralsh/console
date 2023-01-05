import { ComponentProps } from 'react'
import { Code } from '@pluralsh/design-system'

export function RawPageCode({ children, ...props }: ComponentProps<typeof Code>) {
  return (
    <Code
      maxHeight="calc(100vh - 244px)"
      language="yaml"
      {...props}
    >
      {children}
    </Code>
  )
}
