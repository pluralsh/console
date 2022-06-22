import { Ref, forwardRef, useState } from 'react'
import { Div, Flex, FlexProps } from 'honorable'

import CopyIcon from './icons/CopyIcon'

type CodelineProps = FlexProps

const propTypes = {}

function CodelineRef({ children, ...props }: CodelineProps, ref: Ref<any>) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    window.navigator.clipboard.writeText(children as string).then(() => {
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 1250)
    })
  }

  return (
    <Flex
      ref={ref}
      border="1px solid border-fill-two"
      backgroundColor="fill-one"
      borderRadius="medium"
      {...props}
    >
      <Flex
        align="center"
        paddingVertical="small"
        paddingHorizontal="medium"
        overflowX="auto"
        flexGrow={1}
        fontFamily="Monument Semi-Mono, monospace"
        fontSize={14}
        lineHeight="24px"
        color="text-light"
        position="relative"
      >
        <Div
          flexGrow={1}
          whiteSpace="pre"
          tabSize={4}
        >
          {children}
        </Div>
        {copied && (
          <Div
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="fill-one"
            paddingVertical="small"
            paddingHorizontal="medium"
          >
            Copied!
          </Div>
        )}
      </Flex>
      <Flex
        align="center"
        justify="center"
        paddingVertical="small"
        paddingHorizontal="medium"
        backgroundColor="fill-two"
        borderLeft="1px solid border-fill-two"
        cursor="pointer"
        _hover={{ backgroundColor: 'fill-two-hover' }}
        _active={{ backgroundColor: 'fill-two-selected' }}
        onClick={handleCopy}
      >
        <CopyIcon />
      </Flex>
    </Flex>
  )
}

const Codeline = forwardRef(CodelineRef)

Codeline.propTypes = propTypes

export default Codeline
