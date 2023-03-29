import { Flex } from 'honorable'
import moment from 'moment'
import { useEffect, useState } from 'react'

import BuildStatus from '../BuildStatus'

export function Timer({ insertedAt, completedAt }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!completedAt) setTimeout(() => setTick(tick + 1), 1000)
  }, [completedAt, tick, setTick])

  const end = completedAt ? moment(completedAt) : moment()
  const fromBeginning = (dt) => moment.duration(dt.diff(moment(insertedAt)))

  return (
    <>{moment.utc(fromBeginning(end).as('milliseconds')).format('HH:mm:ss')}</>
  )
}

export function BuildTimer({ insertedAt, completedAt, status }) {
  return (
    <Flex
      align="center"
      gap="xsmall"
      id="build-status"
    >
      <BuildStatus
        status={status}
        size="small"
      />
      <span>in</span>
      <Timer
        insertedAt={insertedAt}
        completedAt={completedAt}
      />
    </Flex>
  )
}
