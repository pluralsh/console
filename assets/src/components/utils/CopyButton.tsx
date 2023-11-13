import { Ref, forwardRef, useCallback, useEffect, useState } from 'react'
import { CheckIcon, CopyIcon, IconFrame } from '@pluralsh/design-system'

type CopyButtonProps = {
  text?: string | null | undefined
  type?: 'secondary' | 'tertiary' | 'floating'
  tooltip?: string
}

function CopyButtonRef(
  { text, type = 'floating', tooltip }: CopyButtonProps,
  ref: Ref<any>
) {
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
    <IconFrame
      clickable
      icon={copied ? <CheckIcon /> : <CopyIcon />}
      onClick={() => handleCopy()}
      ref={ref}
      textValue={text ?? undefined}
      tooltip={tooltip !== undefined ? tooltip : true}
      type={type}
    />
  )
}

const CopyButton = forwardRef(CopyButtonRef)

export default CopyButton
