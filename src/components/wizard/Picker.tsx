import styled from 'styled-components'

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import Input from '../Input'
import { SearchIcon } from '../../icons'
import RepositoryChip from '../RepositoryChip'
import Button from '../Button'

import { StepConfig, WizardContext } from './context'
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
    maxHeight: '576px',
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
      ...(theme.partials.text.body2),
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
  const { onSelect, selected } = usePicker()
  const [search, setSearch] = useState<string>(undefined)
  const [scrollable, setScrollable] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isScrollbarVisible = (el: HTMLDivElement) => el?.scrollHeight > el?.clientHeight
  const filtered = useMemo(() => items.filter(item => (search ? item.label.toLowerCase().includes(search) : true)), [items, search])

  const select = useCallback((item: StepConfig) => {
    const isSelected = !!selected.find(i => i.key === item.key)
    const isMax = selected.length >= limit

    return isSelected || !isMax ? onSelect(item) : undefined
  }, [limit, selected, onSelect])

  useEffect(() => {
    const { current } = scrollRef

    if (!current) return

    setScrollable(isScrollbarVisible(current))
  }, [scrollRef, size])

  return (
    <div {...props}>
      <Input
        startIcon={<SearchIcon />}
        placeholder="Filter applications"
        value={search}
        onChange={({ target: { value } }) => setSearch(value.toLowerCase())}
      />
      {filtered.length > 0
      && (
        <div
          className={scrollable ? 'grid scrollable' : 'grid'}
          ref={scrollRef}
        >
          {filtered.map(item => (
            <RepositoryChip
              key={item.key}
              label={item.label}
              imageUrl={item.imageUrl}
              icon={item.Icon && <item.Icon />}
              onClick={() => select(item)}
              checked={selected.findIndex(s => s.label === item.label) > -1}
              disabled={selected.length >= limit}
            />
          ))}
        </div>
      )}
      {filtered.length === 0 && (
        <div className="empty">
          <span className="empty-message">No applications found for "{search}".</span>
          <Button
            secondary
            onClick={() => setSearch('')}
          >Clear search
          </Button>
        </div>
      )}
    </div>
  )
}

export type { PickerProps, StepConfig }
export { Picker }
