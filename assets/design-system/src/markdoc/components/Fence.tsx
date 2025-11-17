import { useMemo } from 'react'
import styled from 'styled-components'
import { type RenderableTreeNode } from '@markdoc/markdoc'

import { Code as CodeBase } from '../../index'
import { type CodeProps } from '../../components/Code'

export function toCodeString({
  process,
  content,
  children,
}: {
  process: boolean
  content: string
  children: RenderableTreeNode[] | RenderableTreeNode
}): string {
  return process
    ? typeof children === 'string'
      ? children
      : Array.isArray(children)
      ? children.join('')
      : ''
    : content || ''
}

export const FenceInner = styled(CodeBase)(({ theme }) => ({
  marginTop: theme.spacing.large,
  marginBottom: theme.spacing.large,
}))

export function Fence({
  children,
  language,
  title,
  showHeader,
  content,
  process,
  ...props
}: CodeProps & { process: boolean }) {
  const codeString = useMemo(
    () => toCodeString({ process, children, content }),
    [process, children, content]
  )

  if (
    showHeader === undefined &&
    (language === 'sh' || language === 'shell' || language === 'bash')
  ) {
    showHeader = false
  }

  return (
    <FenceInner
      showHeader={showHeader}
      language={language}
      title={title}
      {...props}
    >
      {codeString}
    </FenceInner>
  )
}
