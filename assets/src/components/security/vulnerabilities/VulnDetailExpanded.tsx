import { Chip, ChipProps, Flex } from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

import { Overline } from 'components/cd/utils/PermissionsModal'
import { StackedText } from 'components/utils/table/StackedText'
import { Body2BoldP } from 'components/utils/typography/Text'
import { CvssBundle, VulnerabilityFragment } from 'generated/graphql'

const AttackVector = {
  PHYSICAL: 'PHYSICAL',
  LOCAL: 'LOCAL',
  ADJACENT: 'ADJACENT',
  NETWORK: 'NETWORK',
}

export function VulnDetailExpanded({ v }: { v: VulnerabilityFragment }) {
  const theme = useTheme()
  if (!v.title && !v.description && !v.cvssSource && !v.score && !v.cvss) {
    return <VulnerabilityDetailSC>No details available.</VulnerabilityDetailSC>
  }

  console.log('v', v)
  return (
    <VulnerabilityDetailSC>
      <StackedText
        css={{ color: theme.colors['text'] }}
        first={v.title}
        firstPartialType="body2Bold"
        second={v.description}
        secondPartialType="body2"
      />
      {/* <CVSSSection
        bundle={v.cvss}
        source={v.cvssSource}
      /> */}
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
}: {
  bundle?: Nullable<CvssBundle>
  source?: Nullable<string>
}) {
  const theme = useTheme()

  return (
    <Flex
      direction="column"
      gap="large"
    >
      {source && (
        <StackedText
          css={{ color: theme.colors['text'], marginTop: theme.spacing.medium }}
          first={`CVSS Vector (source ${source})`}
          firstPartialType="body2Bold"
          second="Each metric is ordered from low to high severity."
          secondPartialType="body2"
        />
      )}
      <Flex gap="xxxxlarge">
        <Flex
          direction="column"
          gap="medium"
        >
          <Overline>Exploitability metrics</Overline>
          <CVSSRow
            text="Attack vector"
            value={parsedVector.attackVector}
            options={[
              { name: 'Physical', value: AttackVector.PHYSICAL },
              { name: 'Local', value: AttackVector.LOCAL },
              { name: 'Adjacent Network', value: AttackVector.ADJACENT },
              { name: 'Network', value: AttackVector.NETWORK },
            ]}
            colorMap={{
              PHYSICAL: 'success',
              LOCAL: 'warning',
              ADJACENT: 'danger',
              NETWORK: 'critical',
            }}
          />
          <CVSSRow
            text="Attack complexity"
            value={parsedVector.attackComplexity}
            options={[
              { name: 'High', value: 'HIGH' },
              { name: 'Low', value: 'LOW' },
            ]}
            colorMap={{ HIGH: 'warning', LOW: 'critical' }}
          />
          <CVSSRow
            text="Privileges required"
            value={parsedVector.privilegesRequired}
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
          <CVSSRow
            text="User interaction"
            value={parsedVector.userInteraction}
            options={[
              { name: 'Required', value: 'REQUIRED' },
              { name: 'None', value: 'NONE' },
            ]}
            colorMap={{ REQUIRED: 'warning', NONE: 'danger' }}
          />
        </Flex>
        <Flex
          direction="column"
          gap="medium"
        >
          <Overline>Impact metrics</Overline>
          <CVSSRow
            text="Confidentiality"
            value={parsedVector.confidentiality}
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
          <CVSSRow
            text="Integrity"
            value={parsedVector.integrity}
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
          <CVSSRow
            text="Availability"
            value={parsedVector.availability}
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
        </Flex>
      </Flex>
    </Flex>
  )
}
const VulnerabilityDetailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `0 ${theme.spacing.medium}px`,
}))
