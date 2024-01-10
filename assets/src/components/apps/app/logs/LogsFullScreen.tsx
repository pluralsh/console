import { useState } from 'react'
import {
  CloseIcon,
  ExpandIcon,
  IconFrame,
  Input,
  SearchIcon,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'

import LogsLabels from './LogsLabels'
import { LogsCard } from './LogsCard'
import LogsFilters from './LogsFilters'

export default function LogsFullScreen({
  namespace,
  query,
  search,
  setSearch,
  labelList,
  labels,
  setLabels,
  addLabel,
  removeLabel,
}) {
  const theme = useTheme()
  const [open, setOpen] = useState<boolean>(false)

  return (
    <>
      <IconFrame
        icon={<ExpandIcon />}
        tooltip
        tooltipProps={{ placement: 'bottom' }}
        clickable
        textValue="Fullscreen logs"
        type="secondary"
        onClick={() => setOpen(true)}
        css={{ width: 40, height: 40 }}
      />
      {open && (
        <div
          css={{
            backgroundColor: theme.colors['modal-backdrop'],
            padding: theme.spacing.xxxxlarge,
            position: 'fixed',
            top: '0',
            left: '0',
            height: '100vh',
            width: '100vw',
            zIndex: 10,
          }}
        >
          <IconFrame
            icon={<CloseIcon />}
            textValue="Close"
            tooltip
            type="floating"
            clickable
            onClick={() => setOpen(false)}
            css={
              {
                position: 'fixed',
                height: 40,
                width: 40,
                top: 0,
                right: 0,
                margin: theme.spacing.large,
              } as const
            }
          />
          <div
            css={{
              gap: 'medium',
              grow: 1,
            }}
          >
            <Input
              backgroundColor="fill-one"
              marginBottom={labelList?.length > 0 ? '' : 'medium'}
              placeholder="Filter logs"
              startIcon={<SearchIcon size={14} />}
              value={search}
              onChange={({ target: { value } }) => setSearch(value)}
              width="100%"
            />
            <LogsFilters
              search={search}
              setSearch={setSearch}
              labels={labels}
              setLabels={setLabels}
              fullscreen
            />
          </div>
          <LogsLabels
            labels={labelList}
            removeLabel={removeLabel}
          />
          <LogsCard
            namespace={namespace}
            query={query}
            addLabel={addLabel}
            height="100%"
            fullscreen
          />
        </div>
      )}
    </>
  )
}
