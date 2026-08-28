import { TreeNav, TreeNavEntry } from '@pluralsh/design-system'
import {
  PolicyConstraintQuery,
  usePolicyConstraintQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  GATEKEEPER_AFFECTED_RESOURCES_PATH,
  GATEKEEPER_DETAILS_PATH,
} from 'routes/securityRoutesConsts'

import { ResponsiveLayoutSidenavContainer } from '../../../utils/layout/ResponsiveLayoutSidenavContainer'

import { ResponsiveLayoutPage } from '../../../utils/layout/ResponsiveLayoutPage'

export type ConstraintContextType = {
  policy: PolicyConstraintQuery['policyConstraint']
  loading: boolean
}

function Constraint() {
  const params = useParams()
  const navigate = useNavigate()
  const { constraintId } = params

  const route = params['*']
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

  return (
    <ResponsiveLayoutPage>
      <ResponsiveLayoutSidenavContainer css={{ paddingTop: '57px' }}>
        <TreeNav>
          <TreeNavEntry
            key={GATEKEEPER_DETAILS_PATH}
            label="Details"
            onClick={() => {
              if (!route?.includes(GATEKEEPER_DETAILS_PATH)) {
                navigate(GATEKEEPER_DETAILS_PATH)
              }
            }}
            active={route?.includes(GATEKEEPER_DETAILS_PATH)}
          />
          <TreeNavEntry
            key={GATEKEEPER_AFFECTED_RESOURCES_PATH}
            label="Affected Resources"
            onClick={() => {
              if (!route?.includes(GATEKEEPER_AFFECTED_RESOURCES_PATH)) {
                navigate(GATEKEEPER_AFFECTED_RESOURCES_PATH)
              }
            }}
            active={route?.includes(GATEKEEPER_AFFECTED_RESOURCES_PATH)}
          />
        </TreeNav>
      </ResponsiveLayoutSidenavContainer>
      <Outlet context={ctx} />
    </ResponsiveLayoutPage>
  )
}

export default Constraint
