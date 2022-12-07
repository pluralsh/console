import { useState } from 'react'
import {
  ArrowTopRightIcon,
  Button,
  CloseIcon,
  IconFrame,
  Input,
  SearchIcon,
} from '@pluralsh/design-system'

import { Div } from 'honorable'

import LogsLabels from './LogsLabels'
import { LogsCard } from './LogsCard'

export default function LogsFullScreen({
  application, query, search, setSearch, labels, addLabel, removeLabel,
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
          zIndex={999}
        >
          <IconFrame
            icon={<CloseIcon />}
            textValue="close"
            cursor="pointer"
            onClick={() => setOpen(false)}
            top={0}
            right={0}
            margin="large"
            position="fixed"
          />
          <Input
            backgroundColor="fill-one"
            marginBottom={labels?.length > 0 ? '' : 'medium'}
            placeholder="Filter logs"
            startIcon={(<SearchIcon size={14} />)}
            value={search}
            onChange={({ target: { value } }) => setSearch(value)}
          />
          <LogsLabels
            labels={labels}
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
