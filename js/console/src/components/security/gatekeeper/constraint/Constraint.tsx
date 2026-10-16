import {
  PolicyConstraintQuery,
  usePolicyConstraintQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import {
  GATEKEEPER_AFFECTED_RESOURCES_PATH,
  GATEKEEPER_DETAILS_PATH,
  getGatekeeperPath,
} from 'routes/securityRoutesConsts'

import { PageColumnSC, PageContentSC } from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'

export type ConstraintContextType = {
  policy: PolicyConstraintQuery['policyConstraint']
  loading: boolean
}

function Constraint() {
  const { constraintId } = useParams()
  const { pathname } = useLocation()

  const { data, loading } = usePolicyConstraintQuery({
    variables: {
      id: constraintId || '',
    },
  })

  const policy = data?.policyConstraint

  const ctx: ConstraintContextType = useMemo(
    () => ({
      policy,
      loading,
    }),
    [policy, loading]
  )

  const tabs = useMemo(
    () => [
      {
        label: 'Details',
        path: getGatekeeperPath({ constraintId, tab: GATEKEEPER_DETAILS_PATH }),
      },
      {
        label: 'Affected resources',
        path: getGatekeeperPath({
          constraintId,
          tab: GATEKEEPER_AFFECTED_RESOURCES_PATH,
        }),
      },
    ],
    [constraintId]
  )

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) => pathname.startsWith(path)}
      />
      <PageContentSC>
        <Outlet context={ctx} />
      </PageContentSC>
    </PageColumnSC>
  )
}

export default Constraint
