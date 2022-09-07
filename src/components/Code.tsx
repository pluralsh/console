import {
  forwardRef, useEffect, useRef, useState,
} from 'react'
import {
  Button, Div, Flex, FlexProps, Pre,
} from 'honorable'
import hljs from 'highlight.js/lib/core'
import '../hljs'

import styled from 'styled-components'

import CopyIcon from './icons/CopyIcon'
import Card from './Card'
import CheckIcon from './icons/CheckIcon'

const StyledCode = styled.div(({ theme }) => `
pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em;
}

code.hljs {
  padding: 3px 5px;
}

.hljs {
  color: #ebeff0;
  font-family: ${theme.fontFamilies.mono};
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

type CodeProps = FlexProps & {
  children: string,
  language?: string,
}

type HighlightProps = FlexProps & {
  language: string
}

const propTypes = {}

function Highlight({ language, children } : HighlightProps) {
  const codeRef = useRef()

  useEffect(() => {
    if (hljs.getLanguage(language) && codeRef.current) {
      hljs.initHighlighting()
      hljs.highlightBlock(codeRef.current)
    }
  }, [language, children])

  return (
    <Pre
      background="none"
      margin="0"
      padding="large"
      lineHeight="22px"
      className={(language && `language-${language}`) || 'nohighlight'}
      ref={codeRef}
    >
      {children}
    </Pre>
  )
}

function CodeRef({ children, language, ...props }: CodeProps) {
  const [copied, setCopied] = useState(false)
  const [hover, setHover] = useState(false)

  if (typeof children !== 'string') throw new Error('Code component expects a string as its children')

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  const handleCopy = () => window.navigator.clipboard.writeText(children).then(() => setCopied(true))

  return (
    <StyledCode>
      <Card
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        {...props}
      >
        <Flex
          position="relative"
          direction="column"
          height="100%"
        >
          {!!language && (
            <Div
              paddingHorizontal="large"
              paddingVertical="medium"
              borderBottom="1px solid border"
              overline
              color="text-light"
            >
              {language}
            </Div>
          )}
          <Div
            minHeight="90px"
            height="100%"
            overflow="auto"
            alignItems="center"
          >
            {hover && (
              <Button
                position="absolute"
                right="24px"
                top={language ? '73px' : '24px'}
                tertiary
                backgroundColor="fill-three"
                _hover={{ backgroundColor: 'fill-one-hover' }}
                startIcon={copied ? <CheckIcon /> : <CopyIcon />}
                onClick={handleCopy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            )}
            <Highlight language={language}>{children}</Highlight>
          </Div>
        </Flex>
      </Card>
    </StyledCode>
  )
}

const Code = forwardRef(CodeRef)

Code.propTypes = propTypes

export default Code
