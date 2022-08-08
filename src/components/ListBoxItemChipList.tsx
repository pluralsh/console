import {
  ReactElement, cloneElement,
  forwardRef,
  useMemo,
} from 'react'
import styled from 'styled-components'

import Tooltip from './Tooltip'
import Chip from './Chip'

const ChipListInner = styled.div(({ theme }) => ({
  display: 'flex',
  flexDiretion: 'row',
  flexWrap: 'wrap',
  justifyContent: 'end',
  gap: theme.spacing.xxsmall,
  '.tooltip': {
    ...theme.partials.text.caption,
  },
}))

const ChipList = forwardRef<
  HTMLDivElement,
  { chips: ReactElement[]; maxVisible?: number; showExtra?: boolean; }
>(({ chips, maxVisible = 3, showExtra = true }, ref) => {
  const chipHue = 'lightest'

  if (!Array.isArray(chips)) {
    chips = []
  }
  const firstChips = useMemo(() => chips
    .slice(0, maxVisible)
    .filter(chip => !!chip)
    .map((chip, i) => cloneElement(chip, { hue: chipHue, key: i })),
  [chips, maxVisible])
  const restChips = useMemo(() => chips.slice(maxVisible), [chips, maxVisible])

  const extra = useMemo(() => showExtra && restChips.length > 0 && (
    <Tooltip
      placement="top"
      label={(
        <>
          {restChips.map((n, i) => (
            <div
              key={i}
              className="tooltip"
            >
              {n?.props?.children}
              <br />
            </div>
          ))}
        </>
      )}
    >
      <Chip
        size="small"
        hue={chipHue}
      >
        {`+${restChips.length}`}
      </Chip>
    </Tooltip>
  ),
  [restChips, showExtra])

  return <ChipListInner ref={ref}>{[...firstChips, extra]}</ChipListInner>
})

export default ChipList
