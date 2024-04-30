import { Subtitle2H1 } from 'components/utils/typography/Text'
import { Flex } from 'honorable'
import styled, { useTheme } from 'styled-components'

const violationLabels = ['WITHOUT VIOLATIONS', 'WITH VIOLATIONS']

function PoliciesViolationsGauge({
  clustersWithViolations,
  totalClusters,
}: {
  clustersWithViolations: number
  totalClusters: number
}) {
  let startAngle = 180
  const values = [
    totalClusters - clustersWithViolations,
    clustersWithViolations,
  ]
  const theme = useTheme()
  const fillColors = [
    theme.colors['icon-success'],
    theme.colors['text-danger-light'],
  ]

  return (
    <Container>
      <Subtitle2H1>Clusters with Violations</Subtitle2H1>
      <Flex alignItems="center">
        <svg
          width="100"
          height="100"
          viewBox="0 0 200 200"
        >
          {values.map((value, index) => {
            if (value === 0) {
              return null
            }
            const proportion = value / totalClusters

            if (proportion === 1) {
              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r="80"
                  fill={fillColors[index]}
                />
              )
            }
            const endAngle = startAngle + proportion * 360
            const largeArcFlag = proportion > 0.5 ? 1 : 0
            const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
            const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
            const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
            const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)

            const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`

            startAngle = endAngle

            return (
              <path
                key={index}
                d={pathData}
                fill={fillColors[index]}
                stroke={theme.colors['fill-one']}
                strokeWidth={4}
              />
            )
          })}
          <circle
            cx="100"
            cy="100"
            r="65"
            fill={theme.colors['fill-one']}
          />
        </svg>
        <Flex
          direction="column"
          gap="small"
          css={{ marginLeft: theme.spacing.medium }}
        >
          {values.map((value, index) => (
            <Flex
              key={index}
              gap="small"
              alignItems="center"
            >
              <div
                css={{
                  color: fillColors[index],
                }}
              >
                {value}
              </div>
              <span
                css={{
                  color: theme.colors['text-xlight'],
                }}
              >
                {violationLabels[index]}
              </span>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Container>
  )
}

export default PoliciesViolationsGauge

const Container = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  padding: theme.spacing.large,
  display: 'flex',
  flexDirection: 'column',
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.large,
  fontSize: 12,
}))
