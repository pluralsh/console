import { EmptyState, Table } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Violation } from 'generated/graphql'
import { isEmpty } from 'lodash'

import { Row } from '@tanstack/react-table'

import { useNavigate } from 'react-router-dom'

import { ScrollablePage } from '../../../utils/layout/ScrollablePage'

import { getKubernetesResourcePath } from '../../../../routes/kubernetesRoutesConsts'

import {
  ColErrorMessage,
  ColKind,
  ColNamespace,
  ColResourceName,
} from './ViolationsTableColumns'

const columns = [ColResourceName, ColNamespace, ColKind, ColErrorMessage]

export default function PolicyAffectedResources({
  policyName,
  violations,
  clusterId,
  loading,
}: {
  policyName?: string
  violations?: Array<Violation | null> | null
  clusterId?: Nullable<string>
  loading: boolean
}) {
  const navigate = useNavigate()

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
