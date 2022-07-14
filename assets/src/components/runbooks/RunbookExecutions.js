import { Box } from 'grommet'
import moment from 'moment'
import React, { useState } from 'react'

import { extendConnection } from '../../utils/graphql'
import { AvatarCell } from '../audits/Audits'
import { HeaderItem } from '../kubernetes/Pod'
import { StandardScroller } from '../utils/SmoothScroller'

function ExecutionsHeader() {
  return (
    <Box
      direction="row"
      align="center"
      border="bottom"
      pad="small"
      gap="xsmall"
    >
      <HeaderItem
        width="30%"
        text="date"
      />
      <HeaderItem
        width="20%"
        text="actor"
      />
      <HeaderItem
        width="50%"
        text="context"
      />
    </Box>
  )
}

function ExecutionRow({ runbook: { insertedAt, user, context } }) {
  return (
    <Box
      direction="row"
      align="center"
      border="bottom"
      pad="small"
      gap="xsmall"
    >
      <HeaderItem
        width="30%"
        text={moment(insertedAt).format('lll')}
      />
      <AvatarCell
        user={user}
        width="20%"
      />
      <Box
        width="50%"
        style={{ overflow: 'auto' }}
      >
        <code>
          {JSON.stringify(context)}
        </code>
      </Box>
    </Box>
  )
}

export function Placeholder() {
  return (
    <Box
      fill="horizontal"
      height="40px"
    />
  )
}

export function RunbookExecutions({ runbook, loading, fetchMore }) {
  const [listRef, setListRef] = useState(null)
  const { edges, pageInfo } = runbook.executions

  return (
    <Box fill>
      <ExecutionsHeader />
      <Box fill>
        <StandardScroller
          listRef={listRef}
          setListRef={setListRef}
          items={edges}
          loading={loading}
          placeholder={Placeholder}
          hasNextPage={pageInfo.hasNextPage}
          mapper={({ node }) => <ExecutionRow runbook={node} />}
          loadNextPage={() => pageInfo.hasNextPage && fetchMore({
            variables: { cursor: pageInfo.endCursor },
            updateQuery: (prev, { fetchMoreResult: { runbook } }) => (
              { ...prev, runbook: extendConnection(prev, runbook.executions, 'executions') }
            ),
          })}
        />
      </Box>
    </Box>

  )
}
