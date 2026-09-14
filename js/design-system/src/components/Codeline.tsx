import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import Flex, { type FlexProps } from './Flex'
import Tooltip from './Tooltip'

import CopyIcon from './icons/CopyIcon'

type CodelineProps = FlexProps & {
  displayText?: string
  onCopyClick?: (text: string) => Promise<void>
}

function Codeline({
  children,
  displayText,
  onCopyClick,
  ...props
}: CodelineProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    if (onCopyClick) {
      onCopyClick(children as string).then(() => setCopied(true))

      return
    }

    window.navigator.clipboard
      .writeText(children as string)
      .then(() => setCopied(true))
  }, [children, onCopyClick])

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  return (
    <CodelineSC {...props}>
      <CodeWrapSC>
        <CodeTextSC>{displayText || children}</CodeTextSC>
      </CodeWrapSC>
      <CopyWrapSC>
        <Tooltip
          offset={8}
          label="Copied!"
          color="text-success-light"
          placement="top"
          displayOn="manual"
          dismissable
          onOpenChange={(open) => {
            if (!open && copied) setCopied(false)
          }}
          manualOpen={copied}
        >
          <CopyButtonSC onClick={handleCopy}>
            <CopyIcon color="text-light" />
          </CopyButtonSC>
        </Tooltip>
      </CopyWrapSC>
    </CodelineSC>
  )
}

const CodelineSC = styled(Flex)(({ theme }) => ({
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
}))

const CodeWrapSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  paddingTop: theme.spacing.xsmall,
  paddingBottom: theme.spacing.xsmall,
  paddingLeft: theme.spacing.medium,
  paddingRight: theme.spacing.medium,
  overflowX: 'auto',
  flexGrow: 1,
  position: 'relative',
}))

const CopyWrapSC = styled(Flex)({
  width: 38,
  height: 38,
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
})

const CopyButtonSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  cursor: 'pointer',
  borderRadius: theme.borderRadiuses.medium,
  '&:hover': {
    backgroundColor: theme.colors['fill-zero-hover'],
  },
  '&:active': {
    backgroundColor: theme.colors['fill-zero-selected'],
  },
  '& svg': {
    display: 'block',
  },
}))

const CodeTextSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  ...theme.partials.text.code,
  color: theme.colors['text-light'],
  flexGrow: 1,
  whiteSpace: 'pre',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
}))

export default Codeline
