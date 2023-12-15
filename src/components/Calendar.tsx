import {
  type AriaButtonProps,
  type AriaCalendarGridProps,
  type AriaCalendarProps,
  useButton,
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
  useLocale,
} from 'react-aria'
import { type CalendarState, useCalendarState } from 'react-stately'
import { createCalendar, getWeeksInMonth } from '@internationalized/date'

// Reuse the Button from your component library. See below for details.

import styled from 'styled-components'
import React, { type ComponentProps, type ReactNode, useRef } from 'react'
import { type Merge } from 'type-fest'

import classNames from 'classnames'

import { ArrowLeftIcon, ArrowRightIcon } from '../icons'

import IconFrame from './IconFrame'

const CalendarCellSC = styled.td(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors.text,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  '.cellButton': {
    // background: 'blue',
    width: theme.spacing.xlarge,
    height: theme.spacing.xlarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'right',
    cursor: 'pointer',
    borderRadius: theme.borderRadiuses.medium,
    '&:hover': {
      backgroundColor: theme.colors['fill-two-hover'],
    },
    '&:focus': {
      outline: 'none',
    },
    '&:focus-visible': {
      ...theme.partials.focus.button,
    },
    '&.disabled, &.unavailable': {
      cursor: 'not-allowed',
      color: theme.colors['text-input-disabled'],
    },
    '&.selected': {
      backgroundColor: theme.colors['fill-two-selected'],
    },
    '&.outsideRange': {
      display: 'none',
    },
  },
}))

function CalendarCell({ state, date }: any) {
  const ref = React.useRef(null)
  const {
    cellProps,
    buttonProps,
    isSelected,
    isOutsideVisibleRange,
    isDisabled,
    isUnavailable,
    formattedDate,
  } = useCalendarCell({ date }, state, ref)

  return (
    <CalendarCellSC {...cellProps}>
      <div
        {...buttonProps}
        ref={ref}
        hidden={isOutsideVisibleRange}
        className={classNames('cellButton', {
          selected: isSelected,
          disabled: isDisabled,
          unavailable: isUnavailable,
          outsideRange: isOutsideVisibleRange,
        })}
      >
        {formattedDate}
      </div>
    </CalendarCellSC>
  )
}

const CalendarGridSC = styled.table(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(7, minmax(0, 1fr))`,
  gap: theme.spacing.xsmall,

  'tr, tbody, thead': {
    display: 'contents',
  },
  thead: {
    ...theme.partials.text.body2Bold,
  },
  th: {
    padding: 0,
    paddingBottom: theme.spacing.xxsmall,
  },
}))

function CalendarGrid({
  state,
  ...props
}: Merge<
  Merge<ComponentProps<typeof CalendarGridSC>, AriaCalendarGridProps>,
  {
    state: CalendarState
  }
>) {
  const { locale } = useLocale()
  const {
    gridProps: gridEltProps,
    headerProps,
    weekDays,
  } = useCalendarGrid(props, state)

  // Get the number of weeks in the month so we can render the proper number of rows.
  const weeksInMonth = getWeeksInMonth(state.visibleRange.start, locale)

  return (
    <CalendarGridSC {...gridEltProps}>
      <thead {...headerProps}>
        <tr>
          {weekDays.map((day, index) => (
            <th key={index}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...new Array(weeksInMonth).keys()].map((weekIndex) => (
          <tr key={weekIndex}>
            {state.getDatesInWeek(weekIndex).map((date, i) =>
              date ? (
                <CalendarCell
                  key={i}
                  state={state}
                  date={date}
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/control-has-associated-label
                <td key={i} />
              )
            )}
          </tr>
        ))}
      </tbody>
    </CalendarGridSC>
  )
}

const CalendarSC = styled.div(({ theme }) => ({
  flexGrow: 0,
  display: 'flex',
  flexDirection: 'column',
  rowGap: theme.spacing.medium,
  '.header': {
    display: 'flex',
    alignItems: 'center',
    '.title': {
      margin: 0,
      order: 2,
      ...theme.partials.text.subtitle2,
      textAlign: 'center',
      flexGrow: 1,
      padding: `0 ${theme.spacing.small}px`,
    },
    '.button': {
      width: `${100 / 7}%`,
      // flexShrink: 1,
      display: 'flex',
      justifyContent: 'center',
      '> *': {
        flexShrink: 0,
        flexGrow: 0,
      },
    },
    '.nextButton': {
      order: 3,
    },
    '.prevButton': {
      order: 1,
    },
  },
}))

const NextPrevButtonSC = styled(IconFrame)<{ $disabled: boolean }>(
  ({ $disabled, theme }) => ({
    '&&': {
      border: theme.borders.input,
      ...($disabled
        ? { cursor: 'not-allowed', color: theme.colors['icon-disabled'] }
        : {}),
    },
  })
)

function NextPrevButton({
  icon,
  ...props
}: AriaButtonProps & { icon: ReactNode }) {
  const ref = useRef(null)
  const { buttonProps: useButtonProps } = useButton(props, ref)

  return (
    <NextPrevButtonSC
      ref={ref}
      {...(useButtonProps as any)}
      icon={icon}
      clickable={!useButtonProps.disabled}
      $disabled={useButtonProps.disabled}
      type="tertiary"
      size="medium"
    />
  )
}

export function Calendar({
  ...props
}: Merge<ComponentProps<typeof CalendarSC>, AriaCalendarProps<any>>) {
  const { locale } = useLocale()
  const state = useCalendarState({
    ...props,
    locale,
    createCalendar,
  })

  const {
    calendarProps: calendarEltProps,
    prevButtonProps,
    nextButtonProps,
    title,
  } = useCalendar(props, state)

  return (
    <CalendarSC
      {...calendarEltProps}
      className="calendar"
    >
      <div className="header">
        <h3 className="title">{title}</h3>
        <div className="button prevButton">
          {/* @ts-ignore */}
          <NextPrevButton
            icon={<ArrowLeftIcon />}
            {...prevButtonProps}
          />
        </div>
        <div className="button nextButton">
          {/* @ts-ignore */}
          <NextPrevButton
            icon={<ArrowRightIcon />}
            {...nextButtonProps}
          />
        </div>
      </div>
      <CalendarGrid state={state} />
    </CalendarSC>
  )
}
