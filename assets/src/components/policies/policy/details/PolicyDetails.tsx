import { Chip, ErrorIcon, Sidecar, SidecarItem } from '@pluralsh/design-system'
import { Body1P, Title1H1, Title2H1 } from 'components/utils/typography/Text'
import { PolicyConstraintQuery } from 'generated/graphql'
import moment from 'moment'

import styled, { useTheme } from 'styled-components'

function PolicyDetails({
  policy,
}: {
  policy?: PolicyConstraintQuery['policyConstraint']
}) {
  const theme = useTheme()

  if (!policy) {
    return null
  }
  const { name, cluster, violationCount, ref, insertedAt, updatedAt } = policy

  return (
    <PolicyDetailsContainer>
      <div css={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Title1H1
          css={{
            marginTop: 0,
            borderBottom: theme.borders.default,
            paddingBottom: theme.spacing.medium,
          }}
        >
          {name}
        </Title1H1>
        <Title2H1>Description</Title2H1>
        <Body1P css={{ color: theme.colors['text-long-form'] }}>
          {policy.description}
        </Body1P>
        <Title2H1>Recommended action</Title2H1>
        <Body1P css={{ color: theme.colors['text-long-form'] }}>
          {policy.recommendation}
        </Body1P>
      </div>
      <Sidecar width={200}>
        <SidecarItem heading="Policy name"> {name}</SidecarItem>
        <SidecarItem heading="Last Updated">
          {moment(updatedAt || insertedAt).format('lll')}
        </SidecarItem>
        <SidecarItem heading="Violations">
          <Chip
            icon={violationCount ? <ErrorIcon /> : undefined}
            severity={violationCount ? 'danger' : 'success'}
            width={violationCount ? 'auto' : 'fit-content'}
          >
            {violationCount}
          </Chip>
        </SidecarItem>
        {/* {object && (
          <SidecarItem heading="Namespace">
            {object.metadata.namespace}
          </SidecarItem>
        )} */}
        {ref && <SidecarItem heading="Kind"> {ref.kind}</SidecarItem>}
        {cluster && (
          <SidecarItem heading="Cluster name">{cluster?.name}</SidecarItem>
        )}
      </Sidecar>
    </PolicyDetailsContainer>
  )
}

export default PolicyDetails

const PolicyDetailsContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexGrow: 1,
  alignItems: 'flex-start',
  gap: theme.spacing.xlarge,
}))
