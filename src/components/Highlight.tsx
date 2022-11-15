import {
  Ref,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import hljs from 'highlight.js/lib/core'
import '../hljs'

import styled from 'styled-components'
import { ComponentPropsWithoutRef } from 'react-markdown/lib/ast-to-react'

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

const StyledHighlight = styled.div(_ => `
pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em;
}

code.hljs {
  padding: 3px 5px;
}

.hljs ::selection,
.hljs::selection {
  background-color: #383a62;
  color: #ebeff0;
}

.hljs-comment {
  color: #747b8b;
}

.hljs-tag {
  color: #c5c9d3;
}

.hljs-operator,
.hljs-punctuation,
.hljs-subst {
  color: #ebeff0;
}

.hljs-operator {
  opacity: 0.7;
}

.hljs-bullet,
.hljs-deletion,
.hljs-name,
.hljs-selector-tag,
.hljs-template-variable,
.hljs-variable {
  color: #c5c9d3;
}

.hljs-attr,
.hljs-link,
.hljs-literal,
.hljs-number,
.hljs-symbol,
.hljs-variable.constant_ {
  color: #969af8;
}

.hljs-class .hljs-title,
.hljs-title,
.hljs-title.class_ {
  color: #7075f5;
}

.hljs-strong {
  font-weight: 700;
  color: #7075f5;
}
.hljs-addition,
.hljs-code,
.hljs-string,
.hljs-title.class_.inherited__ {
  color: #8fd6ff;
}
.hljs-built_in,
.hljs-doctag,
.hljs-keyword.hljs-atrule,
.hljs-quote,
.hljs-regexp {
  color: #c2e9ff;
}

.hljs-attribute,
.hljs-function .hljs-title,
.hljs-section,
.hljs-title.function_,
.ruby .hljs-property {
  color: #3cecaf;
}

.diff .hljs-meta,
.hljs-keyword,
.hljs-template-tag,
.hljs-type {
  color: #fff48f;
}

.hljs-emphasis {
  color: #fff48f;
  font-style: italic;
}

.hljs-meta,
.hljs-meta .hljs-keyword,
.hljs-meta .hljs-string {
  color: #99f5d5;
}

.hljs-meta .hljs-keyword,
.hljs-meta-keyword {
  font-weight: 700;
}`)

type HighlightProps = Omit<ComponentPropsWithoutRef<'pre'>, 'children'> & {
  language?: string
  showLineNumbers?: boolean
  children: string
}

const propTypes = {}

function HighlightRef({
  language, children, showLineNumbers, ...props
}: HighlightProps,
ref: Ref<any>) {
  if (typeof children !== 'string') {
    throw new Error('Highlight component expects a string as its children')
  }
  const codeRef = useRef()

  const lines = useMemo(() => children.split(/\r?\n/), [children])

  useEffect(() => {
    if (hljs.getLanguage(language) && codeRef.current) {
      hljs.initHighlighting()
      hljs.highlightBlock(codeRef.current)
    }
  }, [language, children])

  return (
    <MainWrap ref={ref}>
      {showLineNumbers && (
        <LineNumbers aria-hidden>
          {lines.map((line, idx) => `${idx + 1}${idx < lines.length - 1 ? '\n' : ''}`)}
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

const Highlight = forwardRef(HighlightRef)

Highlight.propTypes = propTypes

export default Highlight
