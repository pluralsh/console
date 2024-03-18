import { useEffect, useMemo, useState } from 'react'

import TinyQueue from 'tinyqueue'

import LegacyScroller from 'components/utils/LegacyScroller'

import { last } from 'lodash'

import { Div } from 'honorable'

import LogLine from './LogLine'
import { Level } from './misc'
import LogInfo from './LogInfo'

export function determineLevel(line) {
  if (/fatal/i.test(line)) return Level.FATAL
  if (/error/i.test(line)) return Level.ERROR
  if (/warn/i.test(line)) return Level.WARN
  if (/info/i.test(line)) return Level.INFO

  return Level.OTHER
}

function* crossStreams(streams) {
  const q = new TinyQueue<any>(
    [],
    ({ head: { timestamp: left } }, { head: { timestamp: right } }) =>
      right - left
  )

  for (const stream of streams) {
    if (!stream.values || !stream.values[0]) continue
    q.push({ head: stream.values[0], stream, ind: 0 })
  }

  while (q.length) {
    const { head, stream, ind } = q.pop()

    yield {
      line: head,
      level: determineLevel(head.value),
      stream: stream.stream,
    }
    if (stream.values[ind + 1]) {
      q.push({ head: stream.values[ind + 1], stream, ind: ind + 1 })
    }
  }
}

function Placeholder() {
  return (
    <Div
      borderLeft="4px solid border"
      height={20}
      flex={false}
      fontFamily="monospace"
      paddingHorizontal="small"
      paddinbVertical="xxsmall"
    >
      <Div
        height={16}
        width={`${40 + Math.ceil(Math.random() * 40)}%`}
        backgroundColor="fill-two"
      />
    </Div>
  )
}

const defaultUpdate = (prev, { fetchMoreResult: { logs } }) => ({
  ...prev,
  logs: [...prev.logs, ...logs],
})

export default function LogContent({
  listRef,
  setListRef,
  logs,
  namespace,
  loading,
  fetchMore,
  onScroll,
  search,
  setLoader,
  addLabel,
  updateFunc,
  fullscreen = false,
}) {
  const [open, setOpen] = useState<any>(null)
  const [timestamp, setTimestamp] = useState<any>()
  const [stream, setStream] = useState<any>()
  const [done, setDone] = useState(false)
  const end = useMemo<any>(() => last(logs), [logs])
  const lines = useMemo(() => [...crossStreams(logs)], [logs])
  const start = useMemo(
    () => (lines.length > 0 ? `${last(lines)?.line?.timestamp}` : null),
    [lines]
  )

  useEffect(() => {
    if (!end?.values) {
      setDone(true)
    }
  }, [end, done])

  return (
    <>
      <LegacyScroller
        listRef={listRef}
        setListRef={setListRef}
        setLoader={setLoader}
        refreshKey={`${namespace}:${search}`}
        items={lines}
        mapper={({ line, level, stream }, o) => (
          <LogLine
            key={line.timestamp}
            line={line}
            level={level}
            open={open === o}
            onClick={() => {
              setOpen(o)
              setStream(stream)
              setTimestamp(line.timestamp)
            }}
          />
        )}
        handleScroll={onScroll}
        loading={loading}
        placeholder={Placeholder}
        loadNextPage={() =>
          !done &&
          fetchMore({
            variables: { start },
            updateQuery: updateFunc || defaultUpdate,
          })
        }
        hasNextPage={!done}
      />
      {open && (
        <LogInfo
          stamp={timestamp}
          stream={stream}
          addLabel={addLabel}
          onClose={() => setOpen(null)}
          marginTop={fullscreen ? '0' : '104px'}
        />
      )}
    </>
  )
}
