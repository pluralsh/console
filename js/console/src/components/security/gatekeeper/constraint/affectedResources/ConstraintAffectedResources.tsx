import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { Violation } from 'generated/graphql'
import { isEmpty } from 'lodash'

import { Row } from '@tanstack/react-table'

import { useNavigate, useOutletContext } from 'react-router-dom'

import { ScrollablePage } from '../../../../utils/layout/ScrollablePage'

import { getKubernetesResourcePath } from '../../../../../routes/kubernetesRoutesConsts'

import { useMemo } from 'react'
import {
  GATEKEEPER_ABS_PATH,
  GATEKEEPER_AFFECTED_RESOURCES_PATH,
  GATEKEEPER_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import { ConstraintContextType } from '../Constraint'
import {
  ColErrorMessage,
  ColKind,
  ColNamespace,
  ColResourceName,
} from './ViolationsTableColumns'

const columns = [ColResourceName, ColNamespace, ColKind, ColErrorMessage]

export default function ConstraintAffectedResources() {
  const navigate = useNavigate()
  const { policy, loading } = useOutletContext<ConstraintContextType>()
  const policyName = policy?.name
  const clusterId = policy?.cluster?.id
  const violations = policy?.violations

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: `${SECURITY_REL_PATH}`, url: `${SECURITY_ABS_PATH}}` },
        { label: GATEKEEPER_REL_PATH, url: `${GATEKEEPER_ABS_PATH}` },
        { label: policy?.name || '' },
        { label: GATEKEEPER_AFFECTED_RESOURCES_PATH },
      ],
      [policy?.name]
    )
  )

  if (loading) return <LoadingIndicator />

  if (isEmpty(violations))
    return (
      <EmptyState message="Looks like you don't have any violations yet." />
    )

  return (
    <div css={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <ScrollablePage
        scrollable={false}
        heading={policyName}
      >
        <Table
          fullHeightWrap
          virtualizeRows
          data={violations || []}
          columns={columns}
          onRowClick={(
            _e,
            {
              original: { group, version, kind, name, namespace },
            }: Row<Violation>
          ) => {
            const path = getKubernetesResourcePath({
              clusterId,
              group,
              version,
              kind,
              name,
              namespace,
            })

            if (path) navigate(path)
          }}
        />
      </ScrollablePage>
    </div>
  )
}
