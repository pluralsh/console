import { Chip, Code } from '@pluralsh/design-system'
import { Row } from '@tanstack/react-table'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { StackPolicyViolation } from '../../../../generated/graphql.ts'
import { vulnSeverityToChipSeverity } from '../../../security/vulnerabilities/VulnReportDetailsTableCols.tsx'
import { StackedText } from '../../../utils/table/StackedText.tsx'
import { InlineLink } from '../../../utils/typography/InlineLink.tsx'

export default function ViolationExpansionPanel({
  row,
}: {
  row: Row<StackPolicyViolation>
}): ReactNode {
  const theme = useTheme()
  const violation = row.original
  const policyUrl = violation.policyUrl ?? 'N/A'

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div>
        <h3
          css={{
            ...theme.partials.text.title2,
            color: theme.colors.text,
            marginBottom: 0,
          }}
        >
          {violation.policyId}
        </h3>
        <span>{violation.title}</span>
      </div>
      <div
        css={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing.xlarge,
        }}
      >
        <StackedText
          first="Description"
          second={violation.description}
        ></StackedText>
        <StackedText
          first="Policy URL"
          second={
            policyUrl === 'N/A' ? (
              policyUrl
            ) : (
              <InlineLink
                href={policyUrl}
                target="_blank"
              >
                {violation.policyUrl}
              </InlineLink>
            )
          }
        />
        <StackedText
          first="Policy module"
          second={violation.policyModule}
        />
        <StackedText
          first="Resolution"
          second={violation.resolution}
        />
        <StackedText
          first="Severity"
          second={
            <Chip
              severity={
                vulnSeverityToChipSeverity[violation.severity ?? 'Unknown']
              }
            >
              {violation.severity}
            </Chip>
          }
        />
      </div>
      {(violation?.causes?.length ?? 0) > 0 && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xlarge,
          }}
        >
          <div>
            <h3
              css={{
                ...theme.partials.text.title2,
                color: theme.colors.text,
              }}
            >
              Causes
            </h3>
            <span
              css={{
                ...theme.partials.text.body2LooseLineHeight,
              }}
            >
              The code below shows the lines of code that caused the security
              violation.
            </span>
          </div>

          {violation?.causes?.map((v) => {
            const firstLine = v?.lines?.find((l) => l?.first)?.line ?? 0
            const lastLine = v?.lines?.find((l) => l?.last)?.line ?? 0

            return (
              <div>
                <Code
                  language="terraform"
                  title={v?.filename}
                >
                  {v?.lines
                    ?.map((l) => {
                      const isEmpty = l?.content == '..'
                      const firstChar = l?.first ? '┌' : ''
                      const lastChar = l?.last ? '└' : ''
                      const line = l?.line ?? 0
                      const midChar =
                        line > firstLine && line < lastLine ? '│' : ''

                      return `${isEmpty ? '..' : l?.line} ${firstChar}${midChar}${lastChar} ${isEmpty ? '' : l?.content}`
                    })
                    .join('\n')}
                </Code>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
