import { useMemo } from 'react'
import type { ReactNode } from 'react'

import { Code } from '@pluralsh/design-system'

import styled from 'styled-components'

export function toCodeString({
  process,
  content,
  children,
}: {
  process: boolean
  content: string
  children: ReactNode
}): string {
  return process
    ? typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : ''
    : content || ''
}

export const CodeStyled = styled(Code)(({ theme }) => ({
  marginTop: theme.spacing.large,
  marginBottom: theme.spacing.large,
}))

export default function Fence({
  children,
  language,
  title,
  showHeader,
  content,
  process,
  ...props
}) {
  const codeString = useMemo(() => toCodeString({ process, children, content }),
    [process, children, content])

  if (
    showHeader === undefined
    && (language === 'sh' || language === 'shell' || language === 'bash')
  ) {
    showHeader = false
  }

  return (
    <CodeStyled
      showHeader={showHeader}
      language={language}
      title={title}
      {...props}
    >
      {codeString}
    </CodeStyled>
  )
}
