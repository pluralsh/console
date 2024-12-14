import { EmptyState, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Violation } from 'generated/graphql'
import { isEmpty } from 'lodash'

import { Row } from '@tanstack/react-table'

import { useNavigate, useOutletContext } from 'react-router-dom'

import { ScrollablePage } from '../../../../utils/layout/ScrollablePage'

import { getKubernetesResourcePath } from '../../../../../routes/kubernetesRoutesConsts'

import { useMemo } from 'react'
import {
  POLICIES_ABS_PATH,
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import { PolicyContextType } from '../Policy'
import {
  ColErrorMessage,
  ColKind,
  ColNamespace,
  ColResourceName,
} from './ViolationsTableColumns'

const columns = [ColResourceName, ColNamespace, ColKind, ColErrorMessage]

export default function PolicyAffectedResources() {
  const navigate = useNavigate()
  const { policy, loading } = useOutletContext<PolicyContextType>()
  const policyName = policy?.name
  const clusterId = policy?.cluster?.id
  const violations = policy?.violations

  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: `${SECURITY_REL_PATH}`, url: `${SECURITY_ABS_PATH}}` },
        { label: POLICIES_REL_PATH, url: `${POLICIES_ABS_PATH}` },
        { label: policy?.name || '' },
        { label: POLICIES_AFFECTED_RESOURCES_PATH },
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
        <FullHeightTableWrap>
          <Table
            virtualizeRows
            data={violations || []}
            columns={columns}
            css={{
              maxHeight: 'unset',
              height: '100%',
            }}
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
        </FullHeightTableWrap>
      </ScrollablePage>
    </div>
  )
}
