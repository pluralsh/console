import { EmptyState, Table } from '@pluralsh/design-system'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { Title1H1 } from 'components/utils/typography/Text'
import { Violation } from 'generated/graphql'
import { isEmpty } from 'lodash'

import styled, { useTheme } from 'styled-components'

import {
  ColErrorMessage,
  ColKind,
  ColNamespace,
  ColRessourceName,
} from './ViolationsTableColumns'

const columns = [ColRessourceName, ColNamespace, ColKind, ColErrorMessage]

function PolicyAffectedResources({
  policyName,
  violations,
  loading,
}: {
  policyName?: string
  violations?: Array<Violation | null> | null
  loading: boolean
}) {
  const theme = useTheme()

  return (
    <PolicyAffectedResourcesContainer>
      {policyName && (
        <Title1H1
          css={{
            marginTop: 0,
            borderBottom: theme.borders.default,
            paddingBottom: theme.spacing.medium,
            width: '100%',
          }}
        >
          {policyName}
        </Title1H1>
      )}

      {loading ? (
        <LoadingIndicator />
      ) : !isEmpty(violations) ? (
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
      ) : (
        <div css={{ height: '100%' }}>
          <EmptyState message="Looks like you don't have any violations yet." />
        </div>
      )}
    </PolicyAffectedResourcesContainer>
  )
}

export default PolicyAffectedResources

const PolicyAffectedResourcesContainer = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  gap: theme.spacing.xlarge,
  justifyContent: 'center',
}))
