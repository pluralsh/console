import { forwardRef, useEffect, useState } from 'react'
import {
  Button, Div, Flex, FlexProps,
} from 'honorable'

import CopyIcon from './icons/CopyIcon'
import Card from './Card'
import CheckIcon from './icons/CheckIcon'
import Highlight from './Highlight'

type CodeProps = FlexProps & {
  children: string,
  language?: string,
}

const propTypes = {}

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
          <Highlight
            language={language}
            padding="large"
          >
            {children}
          </Highlight>
        </Div>
      </Flex>
    </Card>
  )
}

const Code = forwardRef(CodeRef)

Code.propTypes = propTypes

export default Code
