import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { usePoliciesQuery } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { POLICIES_CREATE_ABS_PATH } from 'routes/securityRoutesConsts'
import { POLICIES_DESCRIPTION } from './Policies'
import { PoliciesTable } from './PoliciesTable'
import { PoliciesTabLayout } from './PoliciesTabLayout'

export function PoliciesList() {
  const navigate = useNavigate()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: usePoliciesQuery,
      keyPath: ['policies'],
    })

  if (error) return <GqlError error={error} />

  return (
    <PoliciesTabLayout
      description={POLICIES_DESCRIPTION}
      actionLabel="New policy"
      onAction={() => navigate(POLICIES_CREATE_ABS_PATH)}
    >
      <PoliciesTable
        data={data}
        loading={loading}
        pageInfo={pageInfo}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
      />
    </PoliciesTabLayout>
  )
}
