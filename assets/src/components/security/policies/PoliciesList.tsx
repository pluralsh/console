import { Button } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Body2P } from 'components/utils/typography/Text'
import { usePoliciesQuery } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { POLICIES_CREATE_ABS_PATH } from 'routes/securityRoutesConsts'
import styled from 'styled-components'
import { POLICIES_DESCRIPTION } from './Policies'
import { PoliciesTable } from './PoliciesTable'

export function PoliciesList() {
  const navigate = useNavigate()
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
          {POLICIES_DESCRIPTION}
        </Body2P>
        <Button
          primary
          small
          css={{ flexShrink: 0 }}
          onClick={() => navigate(POLICIES_CREATE_ABS_PATH)}
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
  minWidth: 0,
  overflow: 'hidden',
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: theme.spacing.medium,
}))
