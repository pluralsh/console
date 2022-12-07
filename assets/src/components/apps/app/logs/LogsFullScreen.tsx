import { useState } from 'react'
import {
  ArrowTopRightIcon,
  Button,
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
      <Button
        secondary
        paddingHorizontal="small"
        onClick={() => setOpen(true)}
      >
        {/* TODO: Switch icon. */}
        <ArrowTopRightIcon />
      </Button>
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
            clickable
            onClick={() => setOpen(false)}
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
          />
        </Div>
      )}
    </>
  )
}
