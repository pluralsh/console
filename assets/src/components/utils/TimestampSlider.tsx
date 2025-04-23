import { Button, Card, HistoryIcon, Slider } from '@pluralsh/design-system'
import { useClickOutside } from '@react-hooks-library/core'
import { useThrottle } from 'components/hooks/useThrottle'
import { useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { formatDateTime, toISOStringOrUndef } from 'utils/datetime'
import { Body2BoldP } from './typography/Text'

type TimestampSliderProps = {
  setTimestamp: (timestamp: string | undefined) => void
  isTimestampSet: boolean
}

export function TimestampSlider({ setTimestamp }: TimestampSliderProps) {
  // slider is a two hour window, with 1 minute increments, "now" is captured when the component mounts
  const DISPLAY_FORMAT = 'h:mm a'
  const [now] = useState(() => new Date().getTime())
  const [internalValue, setInternalValue] = useState<number>(0)
  const throttledInternalValue = useThrottle(internalValue, 100)
  const newDateUnix = now + throttledInternalValue * 60 * 1000

  // using an effect so we can track the throttled value
  useEffect(() => {
    setTimestamp(toISOStringOrUndef(newDateUnix))
  }, [newDateUnix, setTimestamp])

  return (
    <div>
      <Body2BoldP>{formatDateTime(newDateUnix, DISPLAY_FORMAT)}</Body2BoldP>
      <Slider
        colorized={false}
        tooltip={false}
        minValue={-120}
        maxValue={0}
        tickMarks={[
          { value: 0, label: 'Now' },
          { value: -60, label: '1h' },
          { value: -120, label: '2h' },
        ]}
        value={internalValue}
        onChange={(value) => setInternalValue(value)}
      />
    </div>
  )
}

export function TimestampSliderButton({
  setTimestamp,
  isTimestampSet,
}: TimestampSliderProps) {
  const { colors } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  useClickOutside(wrapperRef, () => setIsOpen(false))

  return (
    <div
      ref={wrapperRef}
      css={{ position: 'relative' }}
    >
      <Button
        floating
        css={{
          ...(isTimestampSet && {
            '&&': { borderColor: colors['border-primary'] },
          }),
        }}
        startIcon={<HistoryIcon color="icon-light" />}
        onClick={() => setIsOpen(!isOpen)}
      >
        Timestamp
      </Button>
      <SliderCardSC $isOpen={isOpen}>
        <TimestampSlider
          isTimestampSet={isTimestampSet}
          setTimestamp={setTimestamp}
        />
      </SliderCardSC>
    </div>
  )
}

const SliderCardSC = styled(Card)<{ $isOpen: boolean }>(
  ({ theme, $isOpen }) => ({
    position: 'absolute',
    zIndex: theme.zIndexes.modal,
    top: `calc(100% + ${theme.spacing.xsmall}px)`,
    right: 0,
    width: 496,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px ${theme.spacing.small + 16}px`,
    background: theme.colors['fill-two'],
    ...(!$isOpen && { display: 'none' }),
  })
)
