import { useEffect, useMemo, useState } from 'react'

import TinyQueue from 'tinyqueue'

import LegacyScroller from 'components/utils/LegacyScroller'

import { last } from 'lodash'

import { Div } from 'honorable'

import LogLine from './LogLine'
import { Level } from './misc'

function determineLevel(line) {
  if (/fatal/i.test(line)) return Level.FATAL
  if (/error/i.test(line)) return Level.ERROR
  if (/warn/i.test(line)) return Level.WARN
  if (/info/i.test(line)) return Level.INFO

  return Level.OTHER
}

function* crossStreams(streams) {
  const q = new TinyQueue<any>([], ({ head: { timestamp: left } }, { head: { timestamp: right } }) => right - left)

  for (const stream of streams) {
    if (!stream.values || !stream.values[0]) continue
    q.push({ head: stream.values[0], stream, ind: 0 })
  }

  while (q.length) {
    const { head, stream, ind } = q.pop()

    yield { line: head, level: determineLevel(head.value), stream: stream.stream }
    if (stream.values[ind + 1]) {
      q.push({ head: stream.values[ind + 1], stream, ind: ind + 1 })
    }
  }
}

function Placeholder() {
  return (
    <Div
      height={20}
      flex={false}
      fontFamily="monospace"
    >
      <Div
        height={16}
        width={`${40 + Math.ceil(Math.random() * 40)}%`}
        backgroundColor="fill-two"
      />
    </Div>
  )
}

export default function LogContent({
  listRef, setListRef, logs, name, loading, fetchMore, onScroll, search, setLoader, addLabel,
}) {
  const [done, setDone] = useState(false)
  const end = useMemo<any>(() => last(logs), [logs])
  const lines = useMemo(() => [...crossStreams(logs)], [logs])
  const start = useMemo(() => (lines.length > 0 ? `${last(lines)?.line?.timestamp}` : null), [lines])

  useEffect(() => {
    if (!end?.values) {
      setDone(true)
    }
  }, [end, done])

  return (
    <LegacyScroller
      listRef={listRef}
      setListRef={setListRef}
      setLoader={setLoader}
      refreshKey={`${name}:${search}`}
      items={lines}
      mapper={({ line, level, stream }) => (
        <LogLine
          stream={stream}
          line={line}
          level={level}
          addLabel={addLabel}
        />
      )}
      handleScroll={onScroll}
      loading={loading}
      placeholder={Placeholder}
      loadNextPage={() => !done && fetchMore({
        variables: { start },
        updateQuery: (prev, { fetchMoreResult: { logs } }) => ({ ...prev, logs: [...prev.logs, ...logs] }),
      })}
      hasNextPage={!done}
    />
  )
}
