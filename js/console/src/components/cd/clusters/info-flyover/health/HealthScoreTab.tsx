import { Card, CheckRoundedIcon, Flex } from '@pluralsh/design-system'
import { Body1BoldP, Body2P } from 'components/utils/typography/Text'
import { ClusterOverviewDetailsFragment } from 'generated/graphql.ts'
import { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import { ConfigurationIssuesSection } from './ConfigurationIssuesSection'
import { InfrastructureIssuesSection } from './InfrastructureIssuesSection'

export function HealthScoreTab({
  cluster,
}: {
  cluster: ClusterOverviewDetailsFragment
}) {
  return (
    <Flex
      direction="column"
      gap="xlarge"
      height="100%"
    >
      <InfrastructureIssuesSection cluster={cluster} />
      <ConfigurationIssuesSection cluster={cluster} />
      {/* helpful spacer because bottom padding may get covered, can remove if the layout changes */}
      <div css={{ minHeight: 1 }} />
    </Flex>
  )
}

export function HealthScoreSection({
  title,
  actions,
  children,
}: {
  title: string
  actions: ReactNode
  children: ReactNode
}) {
  return (
    <Flex
      direction="column"
      gap="medium"
      maxHeight={360}
    >
      <Flex
        justify="space-between"
        width="100%"
        align="center"
      >
        <Body1BoldP>{title}</Body1BoldP>
        {actions}
      </Flex>
      {children}
    </Flex>
  )
}

export function IssuesEmptyState({
  name,
  type,
}: {
  name: string
  type: string
}) {
  const { spacing } = useTheme()
  return (
    <Card
      css={{
        flex: 1,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.medium,
      }}
    >
      <CheckRoundedIcon
        color="icon-success"
        size={32}
      />
      <Body2P>{`'${name}' does not have any ${type} issues.`}</Body2P>
    </Card>
  )
}
