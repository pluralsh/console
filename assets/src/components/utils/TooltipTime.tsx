import { Tooltip } from '@pluralsh/design-system'
import { TabularNumbers } from 'components/cluster/TableElements'

import isArray from 'lodash/isArray'
import {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'

export const CopiedSC = styled.div(({ theme }) => ({
  fontSize: '.9em',
  color: theme.colors['text-xlight'],
}))
export const TimeSC = styled.div((_) => ({
  display: 'flex',
  justifyContent: 'space-between',
}))
export const TooltipTimeSC = styled.div`
  cursor: pointer;
`

type BaseProps = {
  startContent?: ReactNode
  endContent?: ReactNode
} & Pick<
  ComponentProps<typeof Tooltip>,
  'placement' | 'displayOn' | 'manualOpen'
> &
  ComponentPropsWithRef<'div'>
type SingleProps = {
  date: ReactElement<any> | string | undefined | null
  prefix?: ReactElement<any> | string | undefined | null
  suffix?: ReactElement<any> | string | undefined | null
} & BaseProps
type MultiProps = {
  date: (ReactElement<any> | string | undefined | null)[]
  prefix?: (ReactElement<any> | string | undefined | null)[]
  suffix?: (ReactElement<any> | string | undefined | null)[]
} & BaseProps

function TooltipTime(props: MultiProps)
function TooltipTime(props: SingleProps)
function TooltipTime({
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
}: MultiProps | SingleProps) {
  const [copied, setCopied] = useState(false)
  const dateArr = isArray(date) ? date : [date]
  const prefixArr = isArray(prefix) ? prefix : [prefix]
  const suffixArr = isArray(suffix) ? suffix : [suffix]
  const timeoutRef = useRef<number>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timeoutRef.current)
    },
    []
  )

  return (
    <Tooltip
      label={
        <>
          {startContent}
          <div>
            {dateArr.map((d, i) => (
              <TimeSC key={`${d}/${i}`}>
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
          window.clearTimeout(timeoutRef.current)
          timeoutRef.current = window.setTimeout(() => {
            setCopied?.(false)
          }, 1500)
          onClick?.(e)
        }}
        {...props}
      />
    </Tooltip>
  )
}

export { TooltipTime }
