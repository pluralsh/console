import { ValueFormats } from 'components/runbooks/utils'
import { Graph } from 'components/utils/Graph'
import { useContext, useMemo } from 'react'
import { useTheme } from 'styled-components'

import { DisplayContext } from '../RunbookDisplay'

const convertVals = (v) =>
  v.map(({ timestamp, value }) => ({
    x: new Date(timestamp * 1000),
    y: parseFloat(value),
  }))

const formatLegend = (legend, props) =>
  !props
    ? legend
    : Object.entries(props).reduce(
        (leg, [k, v]) => leg.replace(`$${k}`, v),
        legend
      )

export function DisplayGraph({ attributes: { datasource, label } }) {
  const { datasources } = useContext(DisplayContext)
  const theme = useTheme()
  const { metrics, format } = useMemo(() => {
    const { prometheus, source } = datasources[datasource]
    const legend = source?.prometheus.legend
    const format = source?.prometheus.format
    const metrics = prometheus.map(({ metric, values }) => ({
      id: formatLegend(legend, metric),
      data: convertVals(values),
    }))

    return { metrics, format: ValueFormats[format] || ((v) => v) }
  }, [datasources, datasource])

  return (
    <div
      css={{
        height: '300px',
        width: '100%',
      }}
    >
      <div
        css={{
          color: theme.colors['text-light'],
          justifyContent: 'center',
          ...theme.partials.text.overline,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
      <Graph
        data={metrics}
        yFormat={format}
        tickRotation={45}
      />
    </div>
  )
}
