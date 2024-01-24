import { Tooltip } from '@pluralsh/design-system'
import { ComponentProps, useCallback, useState } from 'react'
import styled from 'styled-components'

export const CopiedSC = styled.div.attrs(() => ({
  as: 'div',
}))(({ theme }) => ({
  fontSize: '.9em',
  color: theme.colors['text-xlight'],
}))
export const TooltipTimeSC = styled.div``

export function TooltipTime({
  date,
  prefix,
  suffix,
  // tooltip props
  placement,
  displayOn,
  manualOpen,
  // element props
  onClick,
  ...props
}: {
  date: string | null | undefined
} & ComponentProps<typeof TooltipTimeSC> &
  Pick<
    ComponentProps<typeof Tooltip>,
    'placement' | 'displayOn' | 'manualOpen'
  >) {
  const [copied, setCopied] = useState(false)
  const clearCopied = useCallback(() => setCopied(false), [])

  if (!date) {
    return null
  }

  return (
    <Tooltip
      label={
        <>
          {prefix}
          {date}
          {suffix}
          <CopiedSC>({copied ? 'Copied' : 'Click to copy'})</CopiedSC>
        </>
      }
      {...{ placement, displayOn, manualOpen }}
    >
      <TooltipTimeSC
        onClick={(e) => {
          e.stopPropagation()
          window.navigator?.clipboard?.writeText?.(date)
          setCopied(true)
          setTimeout(clearCopied, 1500)
          onClick?.(e)
        }}
        {...props}
      />
    </Tooltip>
  )
}
