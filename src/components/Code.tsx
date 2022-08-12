import {
  forwardRef, useEffect, useRef, useState,
} from 'react'
import {
  Button, Flex, FlexProps, Pre,
} from 'honorable'
import hljs from 'highlight.js'

import { fontFamilies } from '../theme'

import CopyIcon from './icons/CopyIcon'
import Card from './Card'
import CheckIcon from './icons/CheckIcon'

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
      margin="0"
      padding="0"
      background="none"
      fontFamily={fontFamilies.mono}
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
    <Card
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      minHeight="90px"
      {...props}
    >
      <Flex position="relative">
        {hover && (
          <Button
            position="absolute"
            right="24px"
            top="24px"
            tertiary
            backgroundColor="fill-three"
            _hover={{ backgroundColor: 'fill-one-hover' }}
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        )}
        <Flex
          minHeight="90px"
          overflowX="auto"
          padding="large"
          alignItems="center"
        >
          <Highlight language={language}>{children}</Highlight>
        </Flex>
      </Flex>
    </Card>
  )
}

const Code = forwardRef(CodeRef)

Code.propTypes = propTypes

export default Code
