import {
  Ref, forwardRef, useEffect, useState,
} from 'react'
import {
  CssProps, Div, Flex, FlexProps,
} from 'honorable'
import { useTheme } from 'styled-components'

import Tooltip from '../components/Tooltip'

import CopyIcon from './icons/CopyIcon'

type CodelineProps = FlexProps & {
  displayText?: string
}

const propTypes = {}

function CodelineRef({ children, displayText, ...props }: CodelineProps, ref: Ref<any>) {
  const [copied, setCopied] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  const handleCopy = () => window.navigator.clipboard.writeText(children as string).then(() => setCopied(true))

  return (
    <Flex
      ref={ref}
      border="1px solid border-input"
      borderRadius="medium"
      {...props}
    >
      <Flex
        align="center"
        paddingVertical="xsmall"
        paddingHorizontal="medium"
        overflowX="auto"
        flexGrow={1}
        position="relative"
      >
        <Div
          body2
          {...theme.partials.text.code as CssProps}
          color="text-light"
          flexGrow={1}
          whiteSpace="pre"
          textOverflow="ellipsis"
          overflow="hidden"
        >
          {displayText || children}
        </Div>
      </Flex>
      <Flex
        width={38}
        height={38}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Tooltip
          offset={8}
          label="Copied!"
          color="text-success-light"
          placement="top"
          displayOn="manual"
          dismissable
          onOpenChange={open => {
            if (!open && copied) setCopied(false)
          }}
          manualOpen={copied}
        >
          <Flex
            alignItems="center"
            justifyContent="center"
            width={32}
            height={32}
            cursor="pointer"
            borderRadius="medium"
            _hover={{ backgroundColor: 'fill-zero-hover' }}
            _active={{ backgroundColor: 'fill-zero-selected' }}
            onClick={handleCopy}
          >
            <CopyIcon
              color="text-light"
              {...{ '& svg': { display: 'block' } }}
            />
          </Flex>
        </Tooltip>
      </Flex>
    </Flex>
  )
}

const Codeline = forwardRef(CodelineRef)

Codeline.propTypes = propTypes

export default Codeline
