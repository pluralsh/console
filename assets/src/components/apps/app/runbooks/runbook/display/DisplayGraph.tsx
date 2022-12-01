import { ValueFormats } from 'components/runbooks/utils'
import { Graph } from 'components/utils/Graph'
import { Div } from 'honorable'
import { useContext, useMemo } from 'react'

import { DisplayContext } from '../RunbookDisplay'

const convertVals = v => v.map(({ timestamp, value }) => ({ x: new Date(timestamp * 1000), y: parseFloat(value) }))

const formatLegend = (legend, props) => (!props ? legend : Object.entries(props).reduce((leg, [k, v]) => leg.replace(`$${k}`, v), legend))

export function DisplayGraph({ attributes: { datasource, label } }) {
  const { datasources } = useContext(DisplayContext)
  const { metrics, format } = useMemo(() => {
    const { prometheus, source } = datasources[datasource]
    const legend = source?.prometheus.legend
    const format = source?.prometheus.format
    const metrics = prometheus.map(({ metric, values }) => ({
      id: formatLegend(legend, metric),
      data: convertVals(values),
    }))

    return { metrics, format: ValueFormats[format] || (v => v) }
  }, [datasources, datasource])

  return (
    <Div
      height={300}
      width={280}
    >
      <Div
        color="text-light"
        justifyContent="center"
        overline
        textAlign="center"
      >
        {label}
      </Div>
      <Graph
        data={metrics}
        yFormat={format}
        tickRotation={45}
      />
    </Div>
  )
}
