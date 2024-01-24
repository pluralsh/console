import { Tooltip } from '@pluralsh/design-system'
import { TabularNumbers } from 'components/cluster/TableElements'
import isArray from 'lodash/isArray'
import { ComponentProps, ReactNode, useCallback, useState } from 'react'
import styled from 'styled-components'

export const CopiedSC = styled.div(({ theme }) => ({
  fontSize: '.9em',
  color: theme.colors['text-xlight'],
}))
export const TimeSC = styled.div((_) => ({
  display: 'flex',
  justifyContent: 'space-between',
}))
export const TooltipTimeSC = styled.div``

export function TooltipTime({
  date,
  prefix,
  suffix,
  startContent,
  endContent,
  // tooltip props
  placement,
  displayOn,
  manualOpen,
  // element props
  onClick,
  ...props
}: (
  | {
      date: string | null | undefined
      prefix: string | null | undefined
      suffix: string | null | undefined
    }
  | {
      date: string[]
      prefix: string[]
      suffix: string[]
    }
) & { startContent?: ReactNode; endContent?: ReactNode } & ComponentProps<
    typeof TooltipTimeSC
  > &
  Pick<
    ComponentProps<typeof Tooltip>,
    'placement' | 'displayOn' | 'manualOpen'
  >) {
  const [copied, setCopied] = useState(false)
  const clearCopied = useCallback(() => setCopied(false), [])
  const dateArr = isArray(date) ? date : [date]
  const prefixArr = isArray(prefix) ? prefix : [prefix]
  const suffixArr = isArray(suffix) ? suffix : [suffix]

  return (
    <Tooltip
      label={
        <>
          {startContent}
          <div>
            {dateArr.map((d, i) => (
              <TimeSC>
                <div>{prefixArr[i]}</div>
                <div>
                  <TabularNumbers>
                    {d}
                    {suffixArr[i]}
                  </TabularNumbers>
                </div>
              </TimeSC>
            ))}
          </div>
          {endContent}
          <CopiedSC>
            (
            {copied
              ? 'Copied'
              : `Click to copy timestamp${dateArr.length > 1 ? 's' : ''}`}
            )
          </CopiedSC>
        </>
      }
      {...{ placement, displayOn, manualOpen }}
    >
      <TooltipTimeSC
        onClick={(e) => {
          e.stopPropagation()
          window.navigator?.clipboard?.writeText?.(dateArr.join('\n'))
          setCopied(true)
          setTimeout(clearCopied, 1500)
          onClick?.(e)
        }}
        {...props}
      />
    </Tooltip>
  )
}
