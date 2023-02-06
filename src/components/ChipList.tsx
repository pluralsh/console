import { Flex, Span } from 'honorable'
import { ReactElement, useMemo, useState } from 'react'

import { HamburgerMenuCollapseIcon } from '../icons'

import Chip, { ChipProps } from './Chip'
import { useFillLevel } from './contexts/FillLevelContext'

type TransformFn<TValue> = (value: TValue) => string

export type ChipListProps<TValue> = {
  values: Array<TValue>
  transform?: TransformFn<TValue>
  limit: number
} & ChipProps

function ChipList<TValue = string>({
  values = [], transform, limit = 4, ...props
}: ChipListProps<TValue>): ReactElement {
  const [collapsed, setCollapsed] = useState(true)
  const parentFillLevel = useFillLevel()
  const fillLevelClassName = useMemo(() => {
    switch (parentFillLevel) {
    case 0:
      return 'fill-zero'
    case 1:
      return 'fill-one'
    case 2:
      return 'fill-two'
    case 3:
      return 'fill-three'
    }
  }, [parentFillLevel])

  return (
    <Flex
      gap="xsmall"
      wrap
    >
      {values.length === 0 && (
        <Span body2>There is nothing to display here.</Span>
      )}
      {values.slice(0, collapsed ? limit : undefined).map(v => (
        <Chip {...props}>
          {transform ? transform(v) : `${v}`}
        </Chip>
      ))}
      {values.length > limit && (
        <>
          {collapsed && (
            <Chip
              onClick={() => setCollapsed(false)}
              {...props}
              clickable
              background={fillLevelClassName}
            > {`+${values.length - limit}`}
            </Chip>
          )}
          {!collapsed && (
            <Chip
              onClick={() => setCollapsed(true)}
              {...props}
              clickable
              background={fillLevelClassName}
            ><HamburgerMenuCollapseIcon />
            </Chip>
          )}
        </>
      )}
    </Flex>
  )
}

export default ChipList
