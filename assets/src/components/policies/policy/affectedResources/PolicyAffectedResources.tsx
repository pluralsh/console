import { EmptyState, Table } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Violation } from 'generated/graphql'
import { isEmpty } from 'lodash'

import { ScrollablePage } from '../../../utils/layout/ScrollablePage'

import {
  ColErrorMessage,
  ColKind,
  ColNamespace,
  ColRessourceName,
} from './ViolationsTableColumns'

const columns = [ColRessourceName, ColNamespace, ColKind, ColErrorMessage]

export default function PolicyAffectedResources({
  policyName,
  violations,
  loading,
}: {
  policyName?: string
  violations?: Array<Violation | null> | null
  loading: boolean
}) {
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
          />
        </FullHeightTableWrap>
      </ScrollablePage>
    </div>
  )
}
