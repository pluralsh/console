// NOTE: this should be redesigned at some point to be a fully controlled component
// useImperativeHandle gives an escape hatch if parent needs to change values, but it's super bug prone if not used carefully
import { produce } from 'immer'
import { clamp, inRange } from 'lodash'
import {
  ComponentPropsWithoutRef,
  Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import useIsFocused from '../hooks/useIsFocused'
import Input from './Input'

export type Segment = {
  length: number
  min?: number
  max: number
  name: string
  initialVal?: string
}

export type SegmentedInputHandle = {
  clear: () => void
  inputRef: React.RefObject<HTMLInputElement>
  setValue: (val: string) => void
}

export type SegmentedInputProps = {
  onChange: (value: string) => void
  separator: string
  segments: Segment[]
  ref?: Ref<SegmentedInputHandle>
} & ComponentPropsWithoutRef<typeof Input>

export default function SegmentedInput({
  onChange,
  separator,
  segments,
  ref,
  ...props
}: SegmentedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedSegIdx, setSelectedSegIdx] = useState<number | null>(null)
  const [segmentVals, setSegmentVals] = useState<string[]>(() =>
    segments.map((segment) => segment.initialVal ?? '')
  )

  const displayedValue = useMemo(
    () =>
      segmentVals
        .map((val, segNum) =>
          val === ''
            ? segments[segNum].name
            : val.padStart(segments[segNum].length, '0')
        )
        .join(separator),
    [segmentVals, segments, separator]
  )

  // maps the segment number to its indices in the string (not including separators)
  const segNumToSelectionRange: { start: number; end: number }[] =
    useMemo(() => {
      let start = 0
      return segments.map((segment) => {
        const range = { start, end: start + segment.length }
        start += segment.length + separator.length
        return range
      })
    }, [segments, separator.length])

  // maps indices in the string (including separators) to their segment number
  // will have some extra entries at the end but that's fine
  const cursorPosToSegNum: number[] = useMemo(
    () =>
      segments.flatMap((segInfo, segNum) =>
        Array(segInfo.length + separator.length).fill(segNum)
      ),
    [segments, separator.length]
  )

  // select clicked segment on focus (RAF to ensure the cursor position is updated), deselect on blur
  const [isFocused, focusHandlers] = useIsFocused({
    onBlur: () => setSelectedSegIdx(null),
    onFocus: () =>
      requestAnimationFrame(() =>
        setSelectedSegIdx(
          cursorPosToSegNum[inputRef.current?.selectionStart ?? 0]
        )
      ),
  })

  // highlights the currently selected segment in the input
  const applySelection = useCallback(() => {
    if (isFocused && selectedSegIdx !== null) {
      const { start, end } = segNumToSelectionRange[selectedSegIdx]
      inputRef.current?.setSelectionRange(start, end)
    }
  }, [isFocused, selectedSegIdx, segNumToSelectionRange])

  // re-highlight when values change so segment stays highlighted (also fires provided onChange callback)
  useEffect(() => {
    applySelection()
    onChange(segmentVals.join(separator))
  }, [applySelection, onChange, segmentVals, separator])

  const handleClick = () => {
    const newIdx = cursorPosToSegNum[inputRef.current?.selectionStart ?? 0]
    // keeps segment highlighted
    if (newIdx === selectedSegIdx) applySelection()
    setSelectedSegIdx(newIdx)
  }

  const updateSegment = useCallback(
    (segIdx: number, newValue: string) => {
      if (!inRange(segIdx, 0, segments.length)) return

      const { length, min = 0, max } = segments[segIdx]
      let validatedValue = newValue

      // only validate against min/max when the segment is fully filled
      if (validatedValue.length === length) {
        const numValue = parseInt(validatedValue)
        if (!isNaN(numValue))
          validatedValue = clamp(numValue, min, max).toString()
      }

      setSegmentVals(
        produce((prev) => {
          prev[segIdx] = validatedValue
        })
      )
    },
    [segments]
  )

  // handle arrow left/right navigation
  const handleSegmentChange = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (selectedSegIdx === null) return

      const key = e.key
      const direction = key === 'ArrowRight' ? 1 : -1
      const nextIndex = selectedSegIdx + direction

      if (nextIndex >= 0 && nextIndex < segments.length) {
        setSelectedSegIdx(nextIndex)
      }
    },
    [selectedSegIdx, segments.length]
  )

  const handleSegmentValueChange = useCallback(
    ({ key }: React.KeyboardEvent<HTMLInputElement>) => {
      if (selectedSegIdx === null) return
      const { min = 0, max, length } = segments[selectedSegIdx]
      const curSegVal = segmentVals[selectedSegIdx]
      let newVal = ''

      // handle arrow up/down keys
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const segValNum = curSegVal === '' ? min : parseInt(curSegVal, 10)
        if (isNaN(segValNum)) return
        newVal = `${clamp(segValNum + (key === 'ArrowUp' ? 1 : -1), min, max)}`
      }
      // handle numeric kesy
      else if (/^\d$/.test(key)) {
        newVal = curSegVal.length < length ? curSegVal + key : key
        // auto-advance when the segment is completely filled
        if (newVal.length === length && selectedSegIdx < segments.length - 1)
          setSelectedSegIdx(selectedSegIdx + 1)
      }
      updateSegment(selectedSegIdx, newVal)
    },
    [selectedSegIdx, segments, segmentVals, updateSegment]
  )

  // handle clearing segment (delete/backspace)
  const handleSegmentClear = useCallback(() => {
    if (selectedSegIdx === null) return

    updateSegment(selectedSegIdx, '')
  }, [selectedSegIdx, updateSegment])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const key = e.key
      if (!(e.ctrlKey || e.metaKey || key === 'Tab')) e.preventDefault()

      switch (key) {
        case 'ArrowRight':
        case 'ArrowLeft':
          handleSegmentChange(e)
          break
        case 'Backspace':
        case 'Delete':
          handleSegmentClear()
          break
        default:
          if (/^\d$/.test(key) || key === 'ArrowUp' || key === 'ArrowDown')
            handleSegmentValueChange(e)
          break
      }
    },
    [handleSegmentChange, handleSegmentValueChange, handleSegmentClear]
  )
  // a little hacky but not the end of the world
  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        setSegmentVals(segments.map(() => ''))
        setSelectedSegIdx(0)
      },
      setValue: (val: string) => {
        setSegmentVals(val.split(separator))
      },
      inputRef,
    }),
    [segments, separator]
  )

  return (
    <Input
      inputProps={{ ref: inputRef }}
      value={displayedValue}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      css={{ '& input': { lineHeight: 1 } }}
      {...focusHandlers}
      {...props}
    />
  )
}
