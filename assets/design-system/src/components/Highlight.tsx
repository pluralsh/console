import hljs from 'highlight.js/lib/core'
import {
  type ComponentPropsWithoutRef,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import '../hljs'
import { hljsSyntaxStyles } from '../styles/hljsSyntaxStyles'

import styled from 'styled-components'

const MainWrap = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
}))

const StyledPre = styled.pre(({ theme }) => ({
  ...theme.partials.text.code,
  background: 'none',
  margin: 0,
  padding: 0,
}))

const LineNumbers = styled(StyledPre)(({ theme }) => ({
  ...theme.partials.text.code,
  pointerEvents: 'none',
  userSelect: 'none',
  display: 'flex',
  textAlign: 'right',
}))

const StyledHighlight = styled.div(({ theme }) => hljsSyntaxStyles(theme))

type HighlightProps = Omit<ComponentPropsWithoutRef<'pre'>, 'children'> & {
  language?: string
  showLineNumbers?: boolean
  children: string
  ref?: RefObject<HTMLDivElement>
}

function Highlight({
  language,
  children,
  showLineNumbers,
  ref,
  ...props
}: HighlightProps) {
  if (typeof children !== 'string')
    throw new Error('Highlight component expects a string as its children')
  const codeRef = useRef<HTMLPreElement | null>(null)

  const lines = useMemo(() => children.split(/\r?\n/), [children])

  useLayoutEffect(() => {
    if (hljs.getLanguage(language) && codeRef.current) {
      delete codeRef.current.dataset.highlighted
      hljs.highlightElement(codeRef.current)
    }
  }, [language, children])

  return (
    <MainWrap ref={ref}>
      {showLineNumbers && (
        <LineNumbers aria-hidden>
          {lines.map(
            (_, idx) => `${idx + 1}${idx < lines.length - 1 ? '\n' : ''}`
          )}
        </LineNumbers>
      )}
      <StyledHighlight>
        <StyledPre
          className={language ? `language-${language}` : 'nohighlight'}
          ref={codeRef}
          {...props}
        >
          {children}
        </StyledPre>
      </StyledHighlight>
    </MainWrap>
  )
}

export default Highlight
