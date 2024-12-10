import { TreeNav, TreeNavEntry } from '@pluralsh/design-system'
import {
  PolicyConstraintQuery,
  usePolicyConstraintQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  POLICIES_AFFECTED_RESOURCES_PATH,
  POLICIES_DETAILS_PATH,
} from 'routes/securityRoutesConsts'

import { ResponsiveLayoutSidenavContainer } from '../../../utils/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutPage } from '../../../utils/layout/ResponsiveLayoutPage'

export type PolicyContextType = {
  policy: PolicyConstraintQuery['policyConstraint']
  loading: boolean
}

function Policy() {
  const params = useParams()
  const navigate = useNavigate()

  const { policyId } = params

  const route = params['*']
  const { data, loading } = usePolicyConstraintQuery({
    variables: {
      id: policyId || '',
    },
  })

  const policy = data?.policyConstraint

  const ctx: PolicyContextType = useMemo(
    () => ({
      policy,
      loading,
    }),
    [policy, loading]
  )

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer css={{ paddingTop: '57px' }}>
        <TreeNav>
          <TreeNavEntry
            key={POLICIES_DETAILS_PATH}
            label="Details"
            onClick={() => {
              if (!route?.includes(POLICIES_DETAILS_PATH)) {
                navigate(POLICIES_DETAILS_PATH)
              }
            }}
            active={route?.includes(POLICIES_DETAILS_PATH)}
          />
          <TreeNavEntry
            key={POLICIES_AFFECTED_RESOURCES_PATH}
            label="Affected Resources"
            onClick={() => {
              if (!route?.includes(POLICIES_AFFECTED_RESOURCES_PATH)) {
                navigate(POLICIES_AFFECTED_RESOURCES_PATH)
              }
            }}
            active={route?.includes(POLICIES_AFFECTED_RESOURCES_PATH)}
          />
        </TreeNav>
      </ResponsiveLayoutSidenavContainer>
      <Outlet context={ctx} />
    </ResponsiveLayoutPage>
  )
}

export default Policy
