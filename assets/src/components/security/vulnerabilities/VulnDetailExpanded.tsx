import { Chip, ChipProps, Flex } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

import { Overline } from 'components/cd/utils/PermissionsModal'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import {
  CvssBundle,
  VulnAttackVector,
  VulnerabilityFragment,
} from 'generated/graphql'

export function VulnDetailExpanded({ v }: { v: VulnerabilityFragment }) {
  const theme = useTheme()
  if (!v.title && !v.description && !v.cvssSource && !v.score && !v.cvss) {
    return <VulnerabilityDetailSC>No details available.</VulnerabilityDetailSC>
  }

  return (
    <VulnerabilityDetailSC>
      <StackedText
        css={{ color: theme.colors['text'] }}
        first={v.title}
        firstPartialType="body2Bold"
        second={v.description}
        secondPartialType="body2"
      />
      <CVSSSection
        bundle={v.cvss}
        source={v.cvssSource}
        score={v.score}
      />
    </VulnerabilityDetailSC>
  )
}

const CVSSRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',

  gap: theme.spacing.xsmall,
  '.cvssRowContent': {
    display: 'flex',
    gap: theme.spacing.xsmall,
    flexWrap: 'wrap',
  },
}))

function CVSSRow({
  text,
  value,
  options,
  colorMap,
}: {
  text: string
  value: string
  options: { name: string; value: string }[]
  colorMap: Record<string, ChipProps['severity']>
}) {
  return (
    <CVSSRowSC>
      <Body2BoldP $color="text">{text}</Body2BoldP>
      <div className="cvssRowContent">
        {options.map(({ name, value: val }) => (
          <Chip
            key={name}
            severity={value === val ? colorMap[val] : 'neutral'}
            size="small"
            fillLevel={3}
            css={{ opacity: value === val ? 1 : 0.4 }}
          >
            {name}
          </Chip>
        ))}
      </div>
    </CVSSRowSC>
  )
}

function CVSSSection({
  bundle,
  source,
  score,
}: {
  bundle?: Nullable<CvssBundle>
  source?: Nullable<string>
  score?: Nullable<number>
}) {
  const theme = useTheme()
  const hasMetrics =
    bundle &&
    Object.values(bundle).some(
      (v) => typeof v === 'string' && v !== 'CvssBundle'
    )

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {source && score && (
        <StackedText
          css={{ color: theme.colors['text'], marginTop: theme.spacing.medium }}
          first={`CVSS Vector (source ${source}, score: ${score})`}
          firstPartialType="body2Bold"
          second="Each metric is ordered from low to high severity."
          secondPartialType="body2"
        />
      )}
      {hasMetrics && (
        <Flex gap="xxxxlarge">
          <Flex
            direction="column"
            gap="medium"
          >
            <Overline>Exploitability metrics</Overline>
            {bundle?.attackVector && (
              <CVSSRow
                text="Attack vector"
                value={bundle.attackVector}
                options={[
                  { name: 'Physical', value: VulnAttackVector.Physical },
                  { name: 'Local', value: VulnAttackVector.Local },
                  {
                    name: 'Adjacent Network',
                    value: VulnAttackVector.Adjacent,
                  },
                  { name: 'Network', value: VulnAttackVector.Network },
                ]}
                colorMap={{
                  PHYSICAL: 'success',
                  LOCAL: 'warning',
                  ADJACENT: 'danger',
                  NETWORK: 'critical',
                }}
              />
            )}
            {bundle?.attackComplexity && (
              <CVSSRow
                text="Attack complexity"
                value={bundle.attackComplexity}
                options={[
                  { name: 'High', value: 'HIGH' },
                  { name: 'Low', value: 'LOW' },
                ]}
                colorMap={{ HIGH: 'warning', LOW: 'critical' }}
              />
            )}
            {bundle?.privilegesRequired && (
              <CVSSRow
                text="Privileges required"
                value={bundle.privilegesRequired}
                options={[
                  { name: 'High', value: 'HIGH' },
                  { name: 'Low', value: 'LOW' },
                  { name: 'None', value: 'NONE' },
                ]}
                colorMap={{
                  HIGH: 'warning',
                  LOW: 'danger',
                  NONE: 'critical',
                }}
              />
            )}
            {bundle?.userInteraction && (
              <CVSSRow
                text="User interaction"
                value={bundle.userInteraction}
                options={[
                  { name: 'Required', value: 'REQUIRED' },
                  { name: 'None', value: 'NONE' },
                ]}
                colorMap={{ REQUIRED: 'warning', NONE: 'danger' }}
              />
            )}
          </Flex>
          <Flex
            direction="column"
            gap="medium"
          >
            <Overline>Impact metrics</Overline>
            {bundle?.confidentiality && (
              <CVSSRow
                text="Confidentiality"
                value={bundle.confidentiality}
                options={[
                  { name: 'None', value: 'NONE' },
                  { name: 'Low', value: 'LOW' },
                  { name: 'High', value: 'HIGH' },
                ]}
                colorMap={{
                  NONE: 'warning',
                  LOW: 'danger',
                  HIGH: 'critical',
                }}
              />
            )}
            {bundle?.integrity && (
              <CVSSRow
                text="Integrity"
                value={bundle.integrity}
                options={[
                  { name: 'None', value: 'NONE' },
                  { name: 'Low', value: 'LOW' },
                  { name: 'High', value: 'HIGH' },
                ]}
                colorMap={{
                  NONE: 'warning',
                  LOW: 'danger',
                  HIGH: 'critical',
                }}
              />
            )}
            {bundle?.availability && (
              <CVSSRow
                text="Availability"
                value={bundle.availability}
                options={[
                  { name: 'None', value: 'NONE' },
                  { name: 'Low', value: 'LOW' },
                  { name: 'High', value: 'HIGH' },
                ]}
                colorMap={{
                  NONE: 'warning',
                  LOW: 'danger',
                  HIGH: 'critical',
                }}
              />
            )}
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}
const VulnerabilityDetailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `0 ${theme.spacing.medium}px`,
}))
