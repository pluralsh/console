import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { useBindingPoliciesQuery } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { POLICIES_ATTACHMENT_RULES_CREATE_ABS_PATH } from 'routes/securityRoutesConsts'
import { AttachmentRulesTable } from './AttachmentRulesTable'
import { PoliciesTabLayout } from './PoliciesTabLayout'

export const ATTACHMENT_RULES_DESCRIPTION =
  "Rules that decide which workbenches and stacks a policy attaches to. Each rule evaluates one bind policy against the target object — matching targets inherit the policy, narrowed by the rule's tool regexes."

export function AttachmentRules() {
  const navigate = useNavigate()
  const { data, loading, error, pageInfo, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData({
      queryHook: useBindingPoliciesQuery,
      keyPath: ['bindingPolicies'],
    })

  if (error) return <GqlError error={error} />

  return (
    <PoliciesTabLayout
      description={ATTACHMENT_RULES_DESCRIPTION}
      actionLabel="New attachment"
      onAction={() => navigate(POLICIES_ATTACHMENT_RULES_CREATE_ABS_PATH)}
    >
      <AttachmentRulesTable
        data={data}
        loading={loading}
        pageInfo={pageInfo}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
      />
    </PoliciesTabLayout>
  )
}
