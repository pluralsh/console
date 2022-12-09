import { useState } from 'react'
import {
  ArrowTopRightIcon,
  CloseIcon,
  IconFrame,
  Input,
  SearchIcon,
} from '@pluralsh/design-system'

import { Div, Flex } from 'honorable'

import LogsLabels from './LogsLabels'
import { LogsCard } from './LogsCard'
import LogsFilters from './LogsFilters'

export default function LogsFullScreen({
  application, query, search, setSearch, labelList, labels, setLabels, addLabel, removeLabel,
}) {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <>
      <IconFrame
        icon={<ArrowTopRightIcon />}
        tooltip
        tooltipProps={{ placement: 'bottom' }}
        clickable
        textValue="Fullscreen logs"
        type="secondary"
        onClick={() => setOpen(true)}
        height={40}
        width={40}
      />
      {open && (
        <Div
          backgroundColor="rgba(23, 26, 33, 0.8)"
          padding="xxxxlarge"
          position="fixed"
          top="0"
          left="0"
          height="100vh"
          width="100vw"
          zIndex={10}
        >
          <IconFrame
            icon={<CloseIcon />}
            textValue="Close"
            tooltip
            type="floating"
            clickable
            onClick={() => setOpen(false)}
            height={40}
            width={40}
            top={0}
            right={0}
            margin="large"
            position="fixed"
          />
          <Flex
            gap="medium"
            grow={1}
          >
            <Input
              backgroundColor="fill-one"
              marginBottom={labelList?.length > 0 ? '' : 'medium'}
              placeholder="Filter logs"
              startIcon={(<SearchIcon size={14} />)}
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
          </Flex>
          <LogsLabels
            labels={labelList}
            removeLabel={removeLabel}
          />
          <LogsCard
            application={application}
            query={query}
            addLabel={addLabel}
            height="100%"
            fullscreen
          />
        </Div>
      )}
    </>
  )
}
