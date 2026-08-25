import { Button } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import { usePoliciesQuery } from 'generated/graphql'
import styled from 'styled-components'
import { PoliciesTable } from './PoliciesTable'

export function PoliciesList() {
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: usePoliciesQuery,
      keyPath: ['policies'],
    })

  if (error) return <GqlError error={error} />

  return (
    <WrapperSC>
      <HeaderSC>
        <Body2P
          $color="text-xlight"
          css={{ flex: 1, minWidth: 0 }}
        >
          OPA/Rego documents that govern tool execution. Attach them to
          workbenches and stacks. If any matching policy denies, the tool call
          is rejected.
        </Body2P>
        <Button
          primary
          small
          css={{ flexShrink: 0 }}
        >
          New policy
        </Button>
      </HeaderSC>
      <PoliciesTable
        data={data}
        loading={loading}
        pageInfo={pageInfo}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
      />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.large,
  minHeight: 0,
  overflow: 'hidden',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
}))
