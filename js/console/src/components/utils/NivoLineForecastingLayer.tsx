import { CommonLineProps, LineCustomSvgLayerProps } from '@nivo/line'
import { isEmpty } from 'lodash'
import { DAY_TO_MILLISECONDS } from 'utils/datetime'

export type LineGraphData = {
  id: string
  data: LineGraphDatum[]
}

export type ValidLineGraphDatum = {
  x: Date
  y: number
}

export type LineGraphDatum = {
  x: Date
  y: number | null
}

export type ForecastingData = {
  trendLine: ValidLineGraphDatum[]
  originalData: LineGraphDatum[]
}

const DEFAULT_CONE_UPPER_PERCENT = 0.2
const DEFAULT_CONE_LOWER_PERCENT = 0.1

export function ForecastingLayer({
  xScale,
  yScale,
  originalData,
  trendLineData,
  showCone = true,
  coneUpperPercent = DEFAULT_CONE_UPPER_PERCENT,
  coneLowerPercent = DEFAULT_CONE_LOWER_PERCENT,
}: Pick<LineCustomSvgLayerProps<LineGraphData>, 'xScale' | 'yScale'> & {
  originalData: LineGraphDatum[]
  trendLineData: ValidLineGraphDatum[]
  showCone?: boolean
  coneUpperPercent?: number
  coneLowerPercent?: number
}) {
  if (isEmpty(trendLineData)) return null

  const trendSvgPath = trendLineData
    .map((point) => ({
      x: xScale(point.x),
      y: yScale(point.y),
    }))
    .reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`
      return `${path} L ${point.x} ${point.y}`
    }, '')

  const lastOriginalPoint = originalData.findLast((point) => point.y !== null)
  const trendEndPoint = trendLineData.at(-1)
  if (!lastOriginalPoint || !trendEndPoint) return null

  const coneStartPoint =
    trendLineData.find(
      (point) =>
        Math.abs(point.x.getTime() - lastOriginalPoint.x.getTime()) <
        DAY_TO_MILLISECONDS // within 1 day
    ) ?? lastOriginalPoint

  const startX = xScale(coneStartPoint.x)
  const endX = xScale(trendEndPoint.x)
  const startY = yScale(coneStartPoint.y)
  const endYUpper = yScale(
    Math.max(0, trendEndPoint.y * (1 + coneUpperPercent))
  )
  const endYLower = yScale(
    Math.max(0, trendEndPoint.y * (1 - coneLowerPercent))
  )
  const coneSvgPath = `M ${startX} ${startY} L ${endX} ${endYUpper} L ${endX} ${endYLower} Z`

  return (
    <g>
      <defs>
        <linearGradient
          id="forecastConeGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop
            offset="0%"
            stopColor="#66C7FF"
            stopOpacity={0.1}
          />
          <stop
            offset="100%"
            stopColor="#66C7FF"
            stopOpacity={0.3}
          />
        </linearGradient>
      </defs>

      {/* cone */}
      {showCone && (
        <path
          d={coneSvgPath}
          fill="url(#forecastConeGradient)"
          stroke="none"
        />
      )}

      {/* trend line */}
      <path
        d={trendSvgPath}
        stroke="#66C7FF"
        strokeWidth={2}
        strokeDasharray="8,4"
        fill="none"
        opacity={0.8}
      />
    </g>
  )
}

export function calculateLinearRegression(
  points: LineGraphData['data'],
  forecastDays: number
): ValidLineGraphDatum[] {
  if (points.length < 2) return []

  const firstDate = points[0].x.getTime()
  const lastDate = points.at(-1)?.x.getTime() ?? firstDate
  const dataPoints = points
    .filter((p): p is ValidLineGraphDatum => p.y !== null)
    .map((p) => ({
      x: (p.x.getTime() - firstDate) / DAY_TO_MILLISECONDS,
      y: p.y,
    }))

  // calculate linear regression coefficients
  const n = dataPoints.length
  const { sumX, sumY, sumXY, sumXX } = dataPoints.reduce(
    (acc, p) => {
      acc.sumX += p.x
      acc.sumY += p.y
      acc.sumXY += p.x * p.y
      acc.sumXX += p.x * p.x
      return acc
    },
    { sumX: 0, sumY: 0, sumXY: 0, sumXX: 0 }
  )

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  const numDaysTotal =
    (lastDate - firstDate) / DAY_TO_MILLISECONDS + forecastDays

  const trendLine: ValidLineGraphDatum[] = []

  for (let i = 0; i <= numDaysTotal; i++) {
    const predictedValue = slope * i + intercept
    const currentDate = new Date(firstDate + i * DAY_TO_MILLISECONDS)
    if (predictedValue >= 0) {
      trendLine.push({
        x: currentDate,
        y: predictedValue,
      })
    }
  }

  return trendLine
}

export function getYScale(
  forecastingEnabled,
  graphData: LineGraphDatum[],
  trendLineData: ValidLineGraphDatum[],
  coneUpperPercent = DEFAULT_CONE_UPPER_PERCENT,
  coneLowerPercent = DEFAULT_CONE_LOWER_PERCENT
): CommonLineProps<LineGraphData>['yScale'] {
  if (!forecastingEnabled) return { type: 'linear', min: 'auto', max: 'auto' }
  let min = Infinity
  let max = -Infinity

  graphData.forEach((data) => {
    if (data.y !== null) {
      min = Math.min(min, data.y)
      max = Math.max(max, data.y)
    }
  })
  trendLineData.forEach((data) => {
    min = Math.min(min, data.y)
    max = Math.max(max, data.y)
  })
  // add a little extra padding in addition to the cone percents
  const padding = (max - min) * 0.05

  return {
    type: 'linear',
    min: min - min * coneLowerPercent - padding,
    max: max + max * coneUpperPercent + padding,
  }
}
