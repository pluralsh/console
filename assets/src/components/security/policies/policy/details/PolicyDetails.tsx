import {
  Chip,
  EmptyState,
  ErrorIcon,
  Sidecar,
  SidecarItem,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { Body1P, Title2H1 } from 'components/utils/typography/Text'
import { A } from 'honorable'
import { Link, useOutletContext } from 'react-router-dom'
import { getClusterDetailsPath } from 'routes/cdRoutesConsts'
import { formatDateTime } from 'utils/datetime'

import { useTheme } from 'styled-components'

import { useMemo } from 'react'
import {
  POLICIES_ABS_PATH,
  POLICIES_DETAILS_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import { ScrollablePage } from '../../../../utils/layout/ScrollablePage'
import { PolicyContextType } from '../Policy'

function PolicyDetails() {
  const theme = useTheme()

  const { policy } = useOutletContext<PolicyContextType>()

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: `${SECURITY_REL_PATH}`, url: `${SECURITY_ABS_PATH}}` },
        { label: POLICIES_REL_PATH, url: `${POLICIES_ABS_PATH}` },
        { label: policy?.name || '' },
        { label: POLICIES_DETAILS_PATH },
      ],
      [policy?.name]
    )
  )

  if (!policy) {
    return <EmptyState message="Policy details not found" />
  }
  const { name, cluster, violationCount, insertedAt, updatedAt, object } =
    policy

  return (
    <div
      css={{
        display: 'flex',
        flexGrow: 1,
        alignItems: 'flex-start',
        gap: theme.spacing.xlarge,
        height: '100%',
      }}
    >
      <div css={{ flexGrow: 1, height: '100%' }}>
        <ScrollablePage
          heading={name}
          scrollable
          fullWidth
        >
          <Title2H1 css={{ marginTop: 0 }}>Description</Title2H1>
          <Body1P css={{ color: theme.colors['text-long-form'] }}>
            {policy.description ||
              'No description found for this policy, this must be set in an annotation'}
          </Body1P>
          <Title2H1>Recommended action</Title2H1>
          <Body1P css={{ color: theme.colors['text-long-form'] }}>
            {policy.recommendation ||
              'No recommendation found for this policy, this must be set in an annotation'}
          </Body1P>
        </ScrollablePage>
      </div>
      <Sidecar
        width={200}
        minWidth={200}
        marginTop={57}
      >
        <SidecarItem heading="Policy name"> {name}</SidecarItem>
        <SidecarItem heading="Last Updated">
          {formatDateTime(updatedAt || insertedAt, 'M/D/YYYY')}
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
        {object?.metadata?.namespace && (
          <SidecarItem heading="Namespace">
            {object.metadata.namespace}
          </SidecarItem>
        )}
        {object?.kind && (
          <SidecarItem heading="Kind">{object.kind}</SidecarItem>
        )}
        {cluster && (
          <SidecarItem heading="Cluster name">
            <A
              as={Link}
              to={getClusterDetailsPath({ clusterId: cluster.id })}
              inline
            >
              {cluster.name}
            </A>
          </SidecarItem>
        )}
      </Sidecar>
    </div>
  )
}

export default PolicyDetails
