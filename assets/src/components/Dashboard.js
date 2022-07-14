import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'react-apollo'

import { Box, Text } from 'grommet'
import { chunk } from 'lodash'

import filesize from 'filesize'

import { Graph, GraphHeader } from './utils/Graph'
import { DASHBOARD_Q } from './graphql/dashboards'
import { LoopingLogo } from './utils/AnimatedLogo'
import { DarkSelect } from './utils/Select'

const HOUR = 60 * 60
const DAY = 24 * HOUR

export const DURATIONS = [
  { offset: HOUR, step: '2m', label: '1h', tick: 'every 10 minutes' },
  { offset: 2 * HOUR, step: '4m', label: '2h', tick: 'every 20 minutes' },
  { offset: 6 * HOUR, step: '10m', label: '6h', tick: 'every 30 minutes' },
  { offset: DAY, step: '20m', label: '1d', tick: 'every 2 hours' },
  { offset: 7 * DAY, step: '1h', label: '7d', tick: 'every 12 hours' },
]

export function format(value, format) {
  switch (format) {
    case 'bytes':
      return filesize(value)
    case 'percent':
      return `${Math.round(value * 10000) / 100}%`
    default:
      return value
  }
}

function RangeOption({ duration, current, setDuration, first, last }) {
  const selected = duration === current

  return (
    <Box
      round={(first || last) ? { corner: (first ? 'left' : 'right'), size: 'xsmall' } : null}
      pad="small"
      align="center"
      justify="center"
      focusIndicator={false}
      background={selected ? 'cardHover' : null}
      hoverIndicator="cardHover"
      onClick={() => setDuration(duration)}
    >
      <Text
        size="small"
        weight={selected ? 'bold' : null}
      >{duration.label}
      </Text>
    </Box>
  )
}

export function RangePicker({ duration, setDuration }) {
  const count = DURATIONS.length

  return (
    <Box
      round="xsmall"
      background="card"
      border={{ color: 'cardHover' }}
    >
      <Box
        direction="row"
        round="xsmall"
        gap="0px"
        border={{ side: 'between', color: 'cardHover' }}
      >
        {DURATIONS.map((dur, ind) => (
          <RangeOption
            key={ind}
            duration={dur}
            current={duration}
            first={ind === 0}
            last={ind === count - 1}
            setDuration={setDuration}
          />
        ))}
      </Box>
    </Box>
  )
}

function DashboardGraph({ graph, tick }) {
  const data = useMemo(() => (
    graph.queries.map(({ legend, results }) => (
      { id: legend, data: results.map(({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: parseFloat(value) })) }
    ))
  ), [graph])

  return (
    <Box
      className="dashboard"
      round="xsmall"
      width="50%"
      pad="small"
      height="300px"
    >
      <GraphHeader text={graph.name} />
      <Box fill>
        <Graph
          data={data}
          yFormat={v => format(v, graph.format)}
          tick={tick}
        />
      </Box>
    </Box>
  )
}

const toSelect = v => ({ label: v, value: v })

function LabelSelect({ label, onSelect }) {
  const [value, setValue] = useState(label.values[0])
  useEffect(() => onSelect(value), [value])

  return (
    <Box width="200px">
      <DarkSelect
        options={label.values.map(toSelect)}
        value={toSelect(value)}
        onChange={({ value }) => setValue(value)}
      />
    </Box>
  )
}

export default function Dashboard({ repo, name }) {
  const [duration, setDuration] = useState(DURATIONS[0])
  const [labelMap, setLabelMap] = useState(null)
  const labels = useMemo(() => Object.entries(labelMap || {}).map(([name, value]) => ({ name, value })), [labelMap])
  const { data } = useQuery(DASHBOARD_Q, {
    variables: { repo, name, labels, step: duration.step, offset: duration.offset },
    pollInterval: 1000 * 30,
    fetchPolicy: 'no-cache',
  })
  useEffect(() => {
    if (!labelMap && data && data.dashboard) {
      const map = data.dashboard.spec.labels.reduce((acc, { name, values }) => ({ ...acc, [name]: values[0] }), {})
      setLabelMap(map)
    }
  }, [data, labelMap, setLabelMap])
  const setLabel = useCallback((label, value) => setLabelMap({ ...labelMap, [label]: value }), [labelMap, setLabelMap])

  if (!data) {
    return (
      <LoopingLogo
        scale="0.75"
        dark
      />
    )
  }
  const { dashboard } = data

  return (
    <Box
      fill
      background="backgroundColor"
      style={{ overflow: 'auto' }}
    >
      <Box
        direction="row"
        pad="small"
        gap="small"
        justify="end"
        align="center"
      >
        {data.dashboard.spec.labels.filter(({ values }) => values.length > 0).map(label => (
          <LabelSelect
            key={`${label.name}:${name}:${repo}`}
            label={label}
            onSelect={value => setLabel(label.name, value)}
          />
        ))}
        <RangePicker
          duration={duration}
          setDuration={setDuration}
        />
      </Box>
      <Box
        fill
        pad={{ horizontal: 'small', bottom: 'small' }}
      >
        {chunk(dashboard.spec.graphs, 2).map((chunk, ind) => (
          <Box
            flex={false}
            key={ind}
            direction="row"
            gap="small"
            margin={{ vertical: 'small' }}
          >
            {chunk.map(graph => (
              <DashboardGraph
                key={graph.name}
                graph={graph}
                tick={duration.tick}
              />
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
