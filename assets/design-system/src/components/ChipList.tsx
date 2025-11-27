import isEmpty from 'lodash-es/isEmpty'
import {
  type ComponentProps,
  type Dispatch,
  type JSX,
  type ReactElement,
  useCallback,
} from 'react'

import Chip, { type ChipProps } from './Chip'
import Flex from './Flex'

type TransformFn<TValue> = (
  value: TValue
) => ComponentProps<typeof Chip>['children']

export type ChipListProps<TValue> = {
  values: TValue[]
  transformValue?: TransformFn<TValue>
  limit: number
  emptyState?: JSX.Element | null
  onClickCondition?: (value: TValue) => boolean
  onClick?: Dispatch<TValue>
} & ChipProps

function ChipList<TValue = string>({
  values = [],
  transformValue,
  limit = 4,
  emptyState,
  onClickCondition,
  onClick,
  ...props
}: ChipListProps<TValue>): ReactElement<any> {
  const chip = useCallback(
    (v: TValue, i: number) => {
      const clickable = onClickCondition?.(v) ?? false

      return (
        <Chip
          key={(v as any).key || i}
          clickable={clickable}
          onClick={() => clickable && onClick(v)}
          {...props}
        >
          {transformValue ? transformValue(v) : `${v}`}
        </Chip>
      )
    },
    [onClick, onClickCondition, props, transformValue]
  )

  return (
    <Flex
      gap="xsmall"
      wrap="wrap"
    >
      {isEmpty(values) &&
        (emptyState !== undefined
          ? emptyState
          : 'There is nothing to display here.')}
      {values.slice(0, limit).map(chip)}
      {values.length > limit && (
        <Chip
          {...props}
          tooltip={
            <Flex
              gap="xsmall"
              wrap="wrap"
            >
              {values.slice(limit, values.length).map(chip)}
            </Flex>
          }
        >{`+${values.length - limit}`}</Chip>
      )}
    </Flex>
  )
}

export default ChipList
