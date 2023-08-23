import {
  type AriaDateFieldProps,
  useDateField,
  useDateSegment,
  useLocale,
} from 'react-aria'
import { type DateFieldState, useDateFieldState } from 'react-stately'
import { createCalendar } from '@internationalized/date'
import { type ComponentProps, useRef } from 'react'
import styled from 'styled-components'
import { type Merge } from 'type-fest'
import classNames from 'classnames'

const DateSegmentSC = styled.div(({ theme }) => {
  const xPad = 1
  const vPad = 2

  return {
    ...theme.partials.text.body1,
    display: 'block',
    '&:focus, &:focus-visible': {
      outline: 'none',
    },
    padding: `${vPad}px ${xPad}px`,
    margin: `${-vPad * 2}px 0`,
    '&.segment-literal': {
      padding: '0 1px',
      margin: '0',
    },
    '&.first': {
      marginLeft: -2,
    },
    '&.last': {
      marginRight: -2,
    },

    textTransform: 'uppercase',
    ':focus-visible': {
      background: theme.colors['fill-three-selected'],
      borderRadius: theme.borderRadiuses.medium,
    },
  }
})

export function DateSegment({
  segment,
  state,
  first,
  last,
}: {
  segment: Parameters<typeof useDateSegment>[0]
  state: DateFieldState
  first: boolean
  last: boolean
}) {
  const ref = useRef(null)
  const { segmentProps } = useDateSegment(segment, state, ref)

  return (
    <DateSegmentSC
      {...segmentProps}
      ref={ref}
      className={classNames('segment', `segment-${segment.type}`, {
        placeholder: segment.isPlaceholder,
        first,
        last,
      })}
    >
      {segment.text}
    </DateSegmentSC>
  )
}

export const DateFieldWrapperSC = styled.div(({ theme: _ }) => ({
  display: 'flex',
  alignItems: 'center',
}))

export function DateField({
  ...props
}: Merge<ComponentProps<typeof DateFieldWrapperSC>, AriaDateFieldProps<any>>) {
  const { locale } = useLocale()
  const state = useDateFieldState({
    ...props,
    locale,
    createCalendar,
  })

  const ref = useRef<HTMLDivElement>(null)
  const { fieldProps } = useDateField(props, state, ref)

  return (
    <DateFieldWrapperSC
      {...fieldProps}
      ref={ref}
      className="field dateField"
    >
      {state.segments.map((segment, i, segments) => (
        <DateSegment
          key={i}
          first={i === 0}
          last={i === segments.length - 1}
          segment={segment}
          state={state}
        />
      ))}
    </DateFieldWrapperSC>
  )
}
