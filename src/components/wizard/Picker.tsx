import styled from 'styled-components'

import {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import Input from '../Input'
import { SearchIcon } from '../../icons'
import RepositoryChip from '../RepositoryChip'
import Button from '../Button'

import { type StepConfig, WizardContext } from './context'
import { usePicker, useWindowSize } from './hooks'

const Picker = styled(PickerUnstyled)(({ theme }) => ({
  height: '100%',
  minHeight: 0,

  '.grid': {
    marginTop: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))',
    gridAutoRows: 'minmax(auto, 40px)',
    gap: '16px',
    height: 'calc(100% - 56px)',
    minHeight: '200px',
    overflow: 'auto',
  },

  '.scrollable': {
    paddingRight: '8px',
  },

  '.empty': {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyItems: 'center',
    flexDirection: 'column',

    '.empty-message': {
      ...theme.partials.text.body2,
      color: theme.colors['text-light'],
      paddingBottom: theme.spacing.small,
    },
  },
}))

type PickerProps = {
  items: Array<StepConfig>
}

function PickerUnstyled({ items, ...props }: PickerProps): JSX.Element {
  const { limit } = useContext(WizardContext)
  const size = useWindowSize()
  const { onSelect, selected, selectedCount } = usePicker()
  const [search, setSearch] = useState<string>(undefined)
  const [scrollable, setScrollable] = useState(false)
  const scrollRef = createRef<HTMLDivElement>()
  const isScrollbarVisible = (el: HTMLDivElement) =>
    el?.scrollHeight > el?.clientHeight
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        search ? item.label.toLowerCase().includes(search) : true
      ),
    [items, search]
  )

  const isSelected = useCallback(
    (item: StepConfig) => !!selected.find((i) => i.key === item.key),
    [selected]
  )
  const isDisabled = useCallback(
    (item: StepConfig) => {
      if (item.isRequired) return true
      if (isSelected(item)) return false

      return selectedCount >= limit
    },
    [isSelected, limit, selectedCount]
  )

  const select = useCallback(
    (item: StepConfig) => {
      const itemSelected = isSelected(item)
      const isMax = selectedCount >= limit

      // Select
      if (!itemSelected && !isMax) onSelect(item)

      // Un-select
      if (itemSelected && !item.isRequired) onSelect(item)
    },
    [isSelected, selectedCount, limit, onSelect]
  )

  useEffect(() => {
    if (!scrollRef.current) return

    setScrollable(isScrollbarVisible(scrollRef.current))
  }, [scrollRef, size])

  // Select required items
  useEffect(
    () =>
      items.filter((item) => item.isRequired).forEach((item) => select(item)),
    [items, select]
  )

  return (
    <div {...props}>
      <Input
        startIcon={<SearchIcon />}
        placeholder="Filter applications"
        value={search}
        onChange={({ target: { value } }) => setSearch(value.toLowerCase())}
      />
      {filtered.length > 0 && (
        <div
          className={scrollable ? 'grid scrollable' : 'grid'}
          ref={scrollRef}
        >
          {filtered.map((item) => (
            <RepositoryChip
              key={item.key}
              label={item.label}
              imageUrl={item.imageUrl}
              icon={item.Icon && <item.Icon />}
              onClick={() => select(item)}
              checked={selected.findIndex((s) => s.label === item.label) > -1}
              disabled={isDisabled(item)}
              tooltip={
                item.isRequired
                  ? item.tooltip || 'This is a required application.'
                  : undefined
              }
            />
          ))}
        </div>
      )}
      {filtered.length === 0 && search?.length > 0 && (
        <div className="empty">
          <span className="empty-message">
            No applications found for "{search}".
          </span>
          <Button
            secondary
            onClick={() => setSearch('')}
          >
            Clear search
          </Button>
        </div>
      )}
      {filtered.length === 0 && !search && (
        <div className="empty">
          <span className="empty-message">
            No applications available to install.
          </span>
        </div>
      )}
    </div>
  )
}

export type { PickerProps, StepConfig }
export { Picker }
