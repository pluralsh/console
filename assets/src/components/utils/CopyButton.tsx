import {
  CheckIcon,
  CopyIcon,
  IconFrame,
  SemanticColorKey,
  Tooltip,
} from '@pluralsh/design-system'
import { useCallback, useEffect, useState } from 'react'

type CopyButtonProps = {
  text?: string | null | undefined
  type?: 'secondary' | 'tertiary' | 'floating'
  tooltip?: string
  iconColor?: SemanticColorKey
}

function CopyButton({
  text,
  type = 'floating',
  tooltip,
  iconColor,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 1000)

      return () => clearTimeout(timeout)
    }
  }, [copied])

  const handleCopy = useCallback(
    () =>
      window.navigator.clipboard
        .writeText(text ?? '')
        .then(() => setCopied(true)),
    [text]
  )

  return (
    <Tooltip
      label={copied ? 'Copied!' : tooltip || text}
      placement="top"
    >
      <IconFrame
        clickable
        icon={
          copied ? (
            <CheckIcon color={iconColor} />
          ) : (
            <CopyIcon color={iconColor} />
          )
        }
        onClick={(e) => {
          e.stopPropagation()
          handleCopy()
        }}
        textValue={text ?? undefined}
        type={type}
      />
    </Tooltip>
  )
}

export default CopyButton
